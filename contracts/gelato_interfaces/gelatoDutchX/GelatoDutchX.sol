pragma solidity ^0.5.10;

//  Imports:
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
import '../../GelatoCore.sol';
import '../../base/Counters.sol';
import '../../base/ERC20.sol';
import '../../base/IcedOut.sol';
import '../../base/Ownable.sol';
import '../../base/SafeMath.sol';


// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
contract GelatoDutchX is IcedOut, SafeTransfer {

    // **************************** State Variables ******************************
    using Counters for Counters.Counter;

    Counters.Counter private orderIds;

    // One OrderState has many SellOrder
    struct OrderState {
        // address sellToken; // token to sell
        // address buyToken; // token to buy
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        // uint256 prepaymentAmount; // maxGas * gelatoGasPrice
    }


    // Interfaces to other contracts that are set during construction.
    // GelatoCore public gelatoCore;
    DutchExchange public dutchExchange;

    // mapping(orderStateId => orderState)
    mapping(uint256 => OrderState) public orderStates;

    // Constants that are set during contract construction and updateable via setters
    uint256 public auctionStartWaitingForFunding;

    string constant execDepositAndSellActionString = "execDepositAndSellAction(uint256,address,address,uint256,uint256,uint256,uint256)";

    string constant execDepositAndSellTriggerString = "execDepositAndSellTrigger(uint256,address,address,uint256,uint256,uint256)";

    string constant execWithdrawActionString = "execWithdrawAction(uint256,address,address,uint256,uint256)";

    string constant execWithdrawTriggerString = "execWithdrawTrigger(uint256,address,address,uint256,uint256)";

    uint256 public execDepositAndSellGas;


    uint256 public execWithdrawGas;
    // **************************** State Variables END ******************************


    // **************************** Events ******************************
    event LogNewOrderCreated(uint256 indexed orderStateId, address indexed seller);
    event LogFeeNumDen(uint256 num, uint256 den);
    event LogActualSellAmount(uint256 indexed executionClaimId,
                              uint256 indexed orderId,
                              uint256 subOrderAmount,
                              uint256 actualSellAmount,
                              uint256 dutchXFee
    );
    event LogOrderCancelled(uint256 indexed executionClaimId,
                            uint256 indexed orderID,
                            address indexed seller
    );
    event LogWithdrawComplete(uint256 indexed executionClaimId,
                              uint256 indexed orderId,
                              address indexed seller,
                              address buyToken,
                              uint256 withdrawAmount
    );
    event LogOrderCompletedAndDeleted(uint256 indexed orderId);
    event LogWithdrawAmount(uint256 num, uint256 den, uint256 withdrawAmount);
    event LogGas(uint256 gas1, uint256 gas2);
    // **************************** Events END ******************************




    /* constructor():
        * constructs Ownable base and sets msg.sender as owner.
        * connects the contract interfaces to deployed instances thereof.
        * sets the state variable constants
    */
    constructor(address payable _GelatoCore, address _DutchExchange, uint256 _execDepositAndSellGas, uint256 _execWithdrawGas)
        // Initialize gelatoCore address & maxGas in IcedOut parent
        IcedOut(_GelatoCore, _execDepositAndSellGas + _execWithdrawGas) // maxGas 277317 for depsositAndSell
        public
    {
        // gelatoCore = GelatoCore(_GelatoCore);
        dutchExchange = DutchExchange(_DutchExchange);
        auctionStartWaitingForFunding = 1;
        execDepositAndSellGas = _execDepositAndSellGas;
        execWithdrawGas = _execWithdrawGas;
    }


    // **************************** State Variable Setters ******************************
    function setAuctionStartWaitingForFunding(uint256 _auctionStartWaitingForFunding)
        onlyOwner
        external
    {
        auctionStartWaitingForFunding = _auctionStartWaitingForFunding;
    }
    // **************************** State Variable Setters END ******************************

    // **************************** timeSellOrders() ******************************
    function timeSellOrders(address _sellToken,
                            address _buyToken,
                            uint256 _numSellOrders,
                            uint256 _sellOrderAmount,
                            uint256 _executionTime,
                            uint256 _intervalSpan
    )
        public
        payable

    {
        // Step1: Zero value preventions
        require(_sellToken != address(0), "GelatoCore.mintExecutionClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintExecutionClaim: _buyToken: No zero addresses allowed");
        require(_sellOrderAmount != 0, "GelatoCore.mintExecutionClaim: _sellOrderAmount cannot be 0");
        require(_numSellOrders != 0, "splitSellOrder: numSubOrders cannot be 0");

        // Step2: Valid execution Time check
        // Check that executionTime is in the future (10 minute buffer given)
        require(_executionTime.add(10 minutes) >= now, "GelatoCore.mintExecutionClaim: Failed test: Execution time must be in the future");
        // Time between different selOrders needs to be at least 6 hours
        require(_intervalSpan >= 6 hours,
            "splitSellOrder: _intervalSpan not at/above minimum of 6 hours"
        );

        // Step3: Invariant Requirements
        // Require that user transfers the correct prepayment amount. Charge 2x execute + Withdraw
        uint256 prepaymentPerSellOrder = calcGelatoPrepayment();
        require(msg.value == prepaymentPerSellOrder.mul(_numSellOrders),  // calc for msg.sender==dappInterface
            "User ETH prepayment transfer is incorrect"
        );
        // Only tokens that are tradeable on the Dutch Exchange can be posted
        require(dutchExchange.getAuctionIndex(_sellToken, _buyToken) != 0, "The selected tokens are not traded on the Dutch Exchange");

        // Step4: Transfer the totalSellVolume from msg.sender(seller) to this contract
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _numSellOrders.mul(_sellOrderAmount), true),
            "splitSellOrder: The transfer of sellTokens from msg.sender to Gelato Interface must succeed"
        );

        // Step5: Instantiate new dutchExchange-specific sell order state
        OrderState memory orderState = OrderState(
            // _sellToken,
            // _buyToken,
            false,  // default: lastAuctionWasWaiting
            0  // default: lastAuctionIndex
            // prepaymentPerSellOrder
        );

        // Step6: fetch new OrderStateId and store orderState in orderState mapping
        // Increment the current OrderId
        Counters.increment(orderIds);
        // Get a new, unique OrderId for the newly created Sell Order
        uint256 orderStateId = orderIds.current();
        // Update GelatoDutchX state variables
        orderStates[orderStateId] = orderState;

        // Step7: Create all sellOrders
        for (uint256 i = 0; i < _numSellOrders; i++) {

            uint256 executionTime = _executionTime.add(_intervalSpan.mul(i));

            uint256 nextExecutionClaimId = getNextExecutionClaimId();

            // Payload: (funcSelector, uint256 executionClaimId, address sellToken, address buyToken, uint256 amount, uint256 executionTime, uint256 prepaymentPerSellOrder, uint256 orderStateId)
            // bytes memory payload = abi.encodeWithSignature(execDepositAndSellString, nextExecutionClaimId, _sellToken, _buyToken, _sellOrderAmount, executionTime, prepaymentPerSellOrder, orderStateId, 0, false);

            // Create Trigger Payload
            bytes memory triggerPayload = abi.encodeWithSignature(execDepositAndSellTriggerString, nextExecutionClaimId, _sellToken, _buyToken, _sellOrderAmount, executionTime, orderStateId);

            // Create Action Payload
            bytes memory actionPayload = abi.encodeWithSignature(execDepositAndSellActionString, nextExecutionClaimId, _sellToken, _buyToken, _sellOrderAmount, executionTime, prepaymentPerSellOrder, orderStateId);

            // mintClaim(address _triggerAddress, bytes memory _triggerPayload, address _actionAddress, bytes memory _actionPayload, uint256 _actionMaxGas, address _executionClaimOwner
            mintClaim(address(this), triggerPayload, address(this), actionPayload, execDepositAndSellGas, msg.sender);

            // old
            // mintClaim(address(this), payload, execDepositAndSellGas);

            // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
            //  *** GELATO CORE PROTOCOL INTERACTION END ***
        }
    }
    // **************************** timeSellOrders() END ******************************

    // Check if execDepositAndSell is executable
    function execDepositAndSellTrigger(uint256 _executionClaimId, address _sellToken, address _buyToken, uint256 _amount, uint256 _executionTime, uint256 _orderStateId)
        internal
        view
        returns (bool)
    {

        // (uint256 executionClaimId, address sellToken, address buyToken, uint256 amount, uint256 executionTime, uint256 prepaymentAmount, uint256 orderStateId , , )  = abi.decode(_memPayload, (uint256, address, address, uint256, uint256, uint256, uint256, uint256, bool));


        // Init state variables
        // SellOrder memory sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];
        // uint256 amount = sellOrder.amount;

        // Check the condition: Execution Time
        // checkTimeCondition(sellOrder.executionTime);
        require(_executionTime <= now,
            "IcedOut Time Condition: Function called scheduled execution time"
        );

        // Check if interface has enough funds to sell on the Dutch Exchange
        require(
            ERC20(_sellToken).balanceOf(address(this)) >= _amount,
            "GelatoInterface.execute: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );

        // Fetch OrderState
        OrderState memory orderState = orderStates[_orderStateId];

        // Fetch past auction values set in state
        uint256 lastAuctionIndex = orderState.lastAuctionIndex;
        bool lastAuctionWasWaiting = orderState.lastAuctionWasWaiting;  // default: false

        // Fetch current DutchX auction values to analyze past auction participation
        (uint256 newAuctionIndex, bool newAuctionIsWaiting) = getAuctionValues(_sellToken, _buyToken);

        if (newAuctionIndex == lastAuctionIndex)
        {
            require(lastAuctionWasWaiting && !newAuctionIsWaiting,
            "newAuctionindex == lastAuctionIndex, but lastAuctionWasWaiting && !newAuctionIsWaiting == false");
            return true;
        }
        else if (newAuctionIndex == lastAuctionIndex.add(1))
        {
            require(lastAuctionWasWaiting && newAuctionIsWaiting || lastAuctionWasWaiting && !newAuctionIsWaiting,
            "newAuctionIndex == lastAuctionIndex.add(1), but lastAuctionWasWaiting && newAuctionIsWaiting || lastAuctionWasWaiting && !newAuctionIsWaiting == false");
            return true;
        }
        else if (newAuctionIndex >= lastAuctionIndex.add(2))
        {
            return true;
        }
        else
        {
            // Claim not executable
            return false;
        }
    }

    // Test if execWithdraw is executable
    function execWithdrawTrigger(uint256 _executionClaimId,
                               address _sellToken,
                               address _buyToken,
                               uint256 _amount,
                               uint256 _lastAuctionIndex)
        internal
        view
        returns (bool)
    {
        // Decode payload
        // (uint256 executionClaimId, address sellToken, address buyToken, uint256 amount, uint256 lastAuctionIndex) = abi.decode(_memPayload, (uint256, address, address, uint256, uint256));

        // Check if auction in DutchX closed
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(_sellToken,
                                                _buyToken,
                                                _lastAuctionIndex
        );

        // Check if the last auction the seller participated in has cleared
        // DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0,
            "den != 0, Last auction did not clear thus far, you have to wait"
        );

        // Callculate withdraw amount
        uint256 withdrawAmount = _amount.mul(num).div(den);

        // // All checks passed
        return true;
    }

    // ****************************  execDepositAndSell(executionClaimId) *********************************
    /**
     * DEV: Called by the execute func in GelatoCore.sol
     * Aim: Post sellOrder on the DutchExchange via depositAndSell()
     */
    function execDepositAndSellAction(uint256 _executionClaimId, address _sellToken, address _buyToken, uint256 _amount, uint256 _executionTime, uint256 _prepaymentAmount, uint256 _orderStateId)
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoInterface.execute: msg.sender != gelatoCore instance address"
        );

        // Fetch owner of execution claim
        address tokenOwner = gelatoCore.ownerOf(_executionClaimId);
        OrderState storage orderState = orderStates[_orderStateId];

        // Fetch current DutchX auction values to analyze past auction participation
        (uint256 newAuctionIndex, bool newAuctionIsWaiting) = getAuctionValues(_sellToken, _buyToken);

        // ### EFFECTS ###
        // Update Order State
        orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
        orderState.lastAuctionIndex = newAuctionIndex;


        uint256 actualSellAmount;
        {
            uint256 dutchXFee;
            // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
            (actualSellAmount, dutchXFee) = _calcActualSellAmount(_amount);

            emit LogActualSellAmount(
                                    _executionClaimId,
                                    _orderStateId,
                                    _amount,
                                    actualSellAmount,
                                    dutchXFee
            );
            // ### EFFECTS END ###

            // INTERACTION: sell on dutchExchange
            _depositAndSell(_sellToken, _buyToken, _amount);
            // INTERACTION: END
        }

        // Mint new token
        {
            // Fetch next executionClaimId
            uint256 nextExecutionClaimId = getNextExecutionClaimId();

            // Create Trigger Payload
            bytes memory triggerPayload = abi.encodeWithSignature(execWithdrawTriggerString, nextExecutionClaimId, _sellToken, _buyToken, actualSellAmount, newAuctionIndex);

            // Create Action Payload
            bytes memory actionPayload = abi.encodeWithSignature(execWithdrawActionString, nextExecutionClaimId, _sellToken, _buyToken, actualSellAmount, newAuctionIndex);

            // Mint new withdraw token
            mintClaim(address(this), triggerPayload, address(this), actionPayload, execWithdrawGas, tokenOwner);

        }
        // ********************** Step7: Execution Logic END **********************

    }
    // **************************** IcedOut execute(executionClaimId) END *********************************

    // Withdraw function executor will call
    function execWithdrawAction(uint256 _executionClaimId, address _sellToken, address _buyToken, uint256 _amount, uint256 _lastAuctionIndex)
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoInterface.execute: msg.sender != gelatoCore instance address"
        );

        // Fetch owner of execution claim
        address tokenOwner = gelatoCore.ownerOf(_executionClaimId);

        // Calculate withdraw amount
        _withdraw(tokenOwner, _sellToken, _buyToken, _lastAuctionIndex, _amount);

        // Event emission
        emit LogWithdrawComplete(_executionClaimId,
                                 _executionClaimId,
                                 tokenOwner,
                                 _buyToken,
                                 _amount
        );
    }

    // **************************** Helper functions *********************************
    // Calculate sub order size accounting for current dutchExchange liquidity contribution fee.
    function _calcActualSellAmount(uint256 _subOrderSize)
        public
        returns(uint256 actualSellAmount, uint256 dutchXFee)
    {
        // Get current fee ratio of Gelato contract
        uint256 num;
        uint256 den;
        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = dutchExchange.getFeeRatio(address(this));

        emit LogFeeNumDen(num, den);

        // Calc fee amount
        dutchXFee = _subOrderSize.mul(num).div(den);

        // Calc actual Sell Amount
        actualSellAmount = _subOrderSize.sub(dutchXFee);
    }

    // Deposit and sell on the dutchExchange
    function _depositAndSell(address _sellToken,
                             address _buyToken,
                             uint256 _sellAmount
    )
        private
    {
        // Approve DutchX to transfer the funds from gelatoInterface
        ERC20(_sellToken).approve(address(dutchExchange), _sellAmount);

        // DEV deposit and sell on the dutchExchange
        dutchExchange.depositAndSell(_sellToken, _buyToken, _sellAmount);
    }

    // Internal fn that withdraws funds from dutchExchange to the sellers account
    function _withdraw(address _seller,
                       address _sellToken,
                       address _buyToken,
                       uint256 _lastAuctionIndex,
                       uint256 _withdrawAmount
    )
        private
    {

        // Withdraw funds from dutchExchange to Gelato
        // DEV uses memory value lastAuctionIndex in case execute func calls it as we already incremented storage value
        dutchExchange.claimAndWithdraw(_sellToken,
                                       _buyToken,
                                       address(this),
                                       _lastAuctionIndex,
                                       _withdrawAmount
        );

        // Transfer Tokens from Gelato to Seller
        safeTransfer(_buyToken, _seller, _withdrawAmount, false);
    }


    // **************************** Helper functions END *********************************



    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel helper on IcedOut.sol

    // Front end has to save all necessary variables and input them automatically for user
    function cancelOrder(address _triggerAddress, bytes calldata _triggerPayload, address _actionAddress, bytes calldata _actionPayload, uint256 _actionMaxGas, uint256 _executionClaimId)
        external
        returns(bool)
    {

        address sellToken;
        uint256 amount;
        uint256 prepaymentAmount;
        {
            // Check if parameters are correct
            // Hash(address trigger, bytes triggerPayload, address action, bytes actionPayload, uint256 actionMaxGas, address dappInterface, uint256 executionClaimId)
            // @Dev not really necessary to conduct the hash check here, as it will be done in gelato core
            // bytes32 executionClaimHash = keccak256(abi.encodePacked(_triggerAddress, _triggerPayload, _actionAddress, _actionPayload, _actionMaxGas, address(this), _executionClaimId));

            // Check that execution claim has the correct funcSelector
            (bytes memory memPayload, bytes4 funcSelector) = decodeWithFunctionSignature(_actionPayload);

            // #### CHECKS ####
            // @DEV check that we are dealing with a execDepositAndSell claim
            require(funcSelector == bytes4(keccak256(bytes(execDepositAndSellActionString))), "Only execDepositAndSell claims can be cancelled");

            address buyToken;
            // Decode actionPayload to reive prepaymentAmount
            (, sellToken, buyToken, amount, , prepaymentAmount, ) = abi.decode(memPayload, (uint256, address, address, uint256, uint256, uint256, uint256));

            // bytes memory actionPayload = abi.encodeWithSignature(execDepositAndSellActionString, nextExecutionClaimId, _sellToken, _buyToken, _sellOrderAmount, executionTime, prepaymentPerSellOrder, orderStateId);

            // address seller = gelatoCore.ownerOf(_executionClaimId);
            address tokenOwner = gelatoCore.ownerOf(_executionClaimId);

            // Only Execution Claim Owner can cancel
            //@DEV We could add that the interface owner can also cancel an execution claim to avoid having oustanding claims that might never get executed. Discuss
            require(msg.sender == tokenOwner, "Only the executionClaim Owner can cancel the execution");

            // // #### CHECKS END ####

            // CHECKS: msg.sender == executionClaimOwner is checked by Core

            // ****** EFFECTS ******
            // Emit event before deletion/burning of relevant variables
            emit LogOrderCancelled(_executionClaimId, _executionClaimId, tokenOwner);
        }



        // Cancel both execution Claims on core
        // ** Gelato Core interactions **
        gelatoCore.cancelExecutionClaim(_triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionMaxGas,
                                        address(this),
                                        _executionClaimId);
        // ** Gelato Core interactions END **

        // ****** EFFECTS END ******

        // ****** INTERACTIONS ******
        // transfer sellAmount back from this contracts ERC20 balance to seller
        // Refund user the given prepayment amount!!!
        msg.sender.transfer(prepaymentAmount);

        // Transfer ERC20 Tokens back to seller
        safeTransfer(sellToken, msg.sender, amount, false);

        // // ****** INTERACTIONS END ******

        // Success
        return true;
    }

    // Allows manual withdrawals on behalf of a seller from any calling address
    // This is allowed also on the GelatoDutchX Automated Withdrawal Interface
    //  because all remaining claims are still executable (do not throw revert as a result)
    //  since they still do postSellOrder. Actually they could now even be a bit cheaper
    //   to execute for the executor, as no withdrawal control flow is entered any more.
    // withdrawManually only works up until the last withdrawal because the last withdrawal is its
    //  own ExecutionClaim on the Core, and a manual withdrawal thereof would result in unwanted complexity.
    // @DEV: Gas Limit Change => Hardcode
    function withdrawManually(address _triggerAddress, address _actionAddress, uint256 _actionMaxGas, uint256 _executionClaimId, bytes calldata _triggerPayload, bytes calldata _actionPayload)
        external
    {
        {
            // Fetch owner of execution claim
            address tokenOwner = gelatoCore.ownerOf(_executionClaimId);
            address sellToken;
            address buyToken;
            uint256 amount;
            uint256 lastAuctionIndex;
            (bytes memory memPayload, bytes4 funcSelector) = decodeWithFunctionSignature(_actionPayload);
            // #### CHECKS ####
            // @DEV check that we are dealing with a execWithdraw claim
            require(funcSelector == bytes4(keccak256(bytes(execWithdrawActionString))), "Only claims that have not been sold yet can be cancelled");

            // Decode payload
            uint256 executionClaimId;
            (executionClaimId, sellToken, buyToken, amount, lastAuctionIndex) = abi.decode(memPayload, (uint256, address, address, uint256, uint256));

            require(executionClaimId == _executionClaimId, "ExecutionClaimIds do not match");

            // ******* CHECKS *******
            // If amount == 0, struct has already been deleted
            require(amount != 0, "Amount for manual withdraw cannot be zero");
            // Only Execution Claim Owner can withdraw manually
            require(msg.sender == tokenOwner, "Only the executionClaim Owner can cancel the execution");

            uint256 num;
            uint256 den;
            (num, den) = dutchExchange.closingPrices(sellToken, buyToken, lastAuctionIndex);

            // Require that the last auction the seller participated in has cleared
            require(den != 0,
                "withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
            );

            uint256 withdrawAmount = amount.mul(num).div(den);

            // Initiate withdraw
            _withdraw(tokenOwner,  // seller
                    sellToken,
                    buyToken,
                    lastAuctionIndex,
                    withdrawAmount
            );
        }

        // Cancel execution claim on core
        gelatoCore.cancelExecutionClaim(_triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionMaxGas,
                                        address(this),
                                        _executionClaimId);



    }

    function getAuctionValues(address _sellToken, address _buyToken)
        internal
        view
        returns(uint256, bool)
    {
        uint256 newAuctionIndex = dutchExchange.getAuctionIndex(_sellToken, _buyToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(_sellToken, _buyToken);

        // Waiting Period variables needed to prevent double participation in DutchX auctions
        bool newAuctionIsWaiting;
        // Check if we are in a Waiting period or auction running period
        if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding)
        {
            newAuctionIsWaiting = true;
        }
        else if (auctionStartTime < now)
        {
            newAuctionIsWaiting = false;
        }
        return(newAuctionIndex, newAuctionIsWaiting);
    }

}


