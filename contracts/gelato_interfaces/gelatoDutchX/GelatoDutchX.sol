pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import '../../base/IcedOut.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
import '@openzeppelin/contracts/drafts/Counters.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';



// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
contract GelatoDutchX is IcedOut {
    // **************************** Events ******************************
    event LogNewOrderCreated(uint256 indexed orderStateId, address indexed seller);
    event LogFeeNumDen(uint256 num, uint256 den);
    event LogActualSellAmount(uint256 indexed executionClaimId,
                              uint256 subOrderAmount,
                              uint256 actualSellAmount,
                              uint256 dutchXFee
    );
    event LogOrderCancelled(uint256 indexed executionClaimId,
                            uint256 indexed orderID,
                            address indexed seller
    );
    event LogWithdrawComplete(uint256 indexed executionClaimId,
                              uint256 indexed orderStateId,
                              address indexed seller,
                              address buyToken,
                              uint256 sellAmount,
                              uint256 withdrawAmount
    );
    event LogOrderCompletedAndDeleted(uint256 indexed orderStateId);
    event LogWithdrawAmount(address indexed sellToken,
                            address indexed buyToken,
                            uint256 indexed auctionIndex,
                            uint256 num,
                            uint256 den,
                            uint256 withdrawAmount
    );
    event LogGas(uint256 gas1, uint256 gas2);
    // **************************** Events END ******************************

    // base contract => Ownable => indirect use through IcedOut
    // Libraries
    // using SafeMath for uint256; => indirect use through IcedOut
    using Counters for Counters.Counter;
    using SafeERC20 for ERC20;

    // One OrderState to many SellOrder
    struct OrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastParticipatedAuctionIndex;  // default: 0
    }

    // One SellOrder to one parent OrderState
    struct SellOrder {
        bool posted;
        uint256 orderStateId; // Link to parent OrderState
        uint256 executionTime; // Condition for execution
        uint256 prepaymentPerSellOrder; // interfaceMaxGas * interface||gelato-GasPrice
        address sellToken; // token to sell
        address buyToken; // token to buy
        uint256 sellAmount; // sellAmount to be posted
    }

    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    // GelatoCore public gelatoCore;
    DutchExchange public dutchExchange;

    // One orderState struct can have many sellOrder structs as children
    // OrderId => parent orderState struct
    Counters.Counter private orderIds;
    mapping(uint256 => OrderState) public orderStates;

    // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
    mapping(uint256 => mapping(uint256 => SellOrder)) public sellOrders;

    // Constants that are set during contract construction and updateable via setters
    uint256 public auctionStartWaitingForFunding;
    // **************************** State Variables END ******************************

    // constructor():
    constructor(address payable _GelatoCore,
                address _DutchExchange,
                uint256 _interfaceMaxGas,
                uint256 _interfaceGasPrice
    )
        // Initialize gelatoCore address & interfaceMaxGas in IcedOut parent
        IcedOut(_GelatoCore, _interfaceMaxGas, _interfaceGasPrice) // interfaceMaxGas 277317 for depsositAndSell
        public
    {
        // gelatoCore = GelatoCore(_GelatoCore);
        dutchExchange = DutchExchange(_DutchExchange);
        auctionStartWaitingForFunding = 1;
    }


    // **************************** State Variable Setters ******************************
    function setAuctionStartWaitingForFunding(uint256 _auctionStartWaitingForFunding)
        onlyOwner
        external
    {
        auctionStartWaitingForFunding = _auctionStartWaitingForFunding;
    }
    // **************************** State Variable Setters END ******************************

    // Create
    // **************************** timedSellOrders() ******************************
    function timedSellOrders(address _sellToken,
                             address _buyToken,
                             uint256 _totalSellVolume,
                             uint256 _numSellOrders,
                             uint256 _amountPerSellOrder,
                             uint256 _executionTime,
                             uint256 _intervalSpan
    )
        public
        payable
    {
        // Step1: Zero value preventions
        require(_sellToken != address(0), "GelatoCore.mintExecutionClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintExecutionClaim: _buyToken: No zero addresses allowed");
        require(_amountPerSellOrder != 0, "GelatoCore.mintExecutionClaim: _amountPerSellOrder cannot be 0");
        require(_totalSellVolume != 0, "timedSellOrders: totalSellVolume cannot be 0");
        require(_numSellOrders != 0, "timedSellOrders: numSubOrders cannot be 0");

        // Step2: Valid execution Time check
        // Check that executionTime is in the future (10 minute buffer given)
        require(_executionTime.add(10 minutes) >= now,
            "GelatoDutchX.timedSellOrders: Failed test: Execution time must be in the future"
        );
        // Time between different selOrders needs to be at least 6 hours
        require(_intervalSpan >= 6 hours,
            "GelatoDutchX.timedSellOrders: _intervalSpan not at/above minimum of 6 hours"
        );

        // Step3: Invariant Requirements
        // Require that user transfers the correct prepayment sellAmount. Charge 2x execute + Withdraw
        uint256 prepaymentPerSellOrder = calcGelatoPrepayment();
        require(msg.value == prepaymentPerSellOrder.mul(_numSellOrders),  // calc for msg.sender==dappInterface
            "GelatoDutchX.timedSellOrders: User ETH prepayment transfer is incorrect"
        );
        // Only tokens that are tradeable on the Dutch Exchange can be posted
        require(dutchExchange.getAuctionIndex(_sellToken, _buyToken) != 0,
            "GelatoDutchX.timedSellOrders: The selected tokens are not traded on the Dutch Exchange"
        );
        // Total Sell Volume must equal individual sellOrderAmount * number of sellOrders
        require(_totalSellVolume == _numSellOrders.mul(_amountPerSellOrder),
            "GelatoDutchX.timedSellOrders: _totalSellVolume != _numSellOrders * _amountPerSellOrder"
        );

        // Step4: Transfer the totalSellVolume from msg.sender(seller) to this contract
        ERC20(_sellToken).safeTransferFrom(msg.sender, address(this), _totalSellVolume);

        // Step5: Instantiate new dutchExchange-specific sell order state
        OrderState memory orderState = OrderState(
            false,  // default: lastAuctionWasWaiting
            0  // default:
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
            SellOrder memory sellOrder = SellOrder(
                false, // not posted yet
                orderStateId,
                _executionTime.add(_intervalSpan.mul(i)),
                prepaymentPerSellOrder,
                _sellToken,
                _buyToken,
                _amountPerSellOrder
            );

            // For each sellOrder, mint one claim that call the execDepositAndSell function
            (uint256 executionClaimId, ) = mintExecutionClaim("execDepositAndSell(uint256)", msg.sender);

            // For each sellOrder, mint one claim that call the execWithdraw function
            (uint256 executionClaimIdPlusOne, ) = mintExecutionClaim("execWithdraw(uint256)", msg.sender);

            // Map first claims to the Sell Order and second claims to the first claim => BONDED Claims
            // @🐮Convert into Mapping of mapping
            // sellOrders[executionClaimId] = sellOrder;
            // sellOrderLink[executionClaimIdPlusOne] = executionClaimId;
            // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
            sellOrders[executionClaimIdPlusOne][executionClaimId] = sellOrder;

            // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
            //  *** GELATO CORE PROTOCOL INTERACTION END ***
        }


        // Step8: Emit New Sell Order
        emit LogNewOrderCreated(orderStateId, msg.sender);
    }
    // **************************** timedSellOrders() END ******************************


    // UPDATE-DELETE
    // ****************************  execDepositAndSell(executionClaimId) *********************************
    /**
     * DEV: Called by the execute func in GelatoCore.sol
     * Aim: Post sellOrder on the DutchExchange via depositAndSell()
     */
    function execDepositAndSell(uint256 _executionClaimId)
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoDutchX.execDepositAndSell: msg.sender != gelatoCore instance address"
        );

        // Step2: Fetch sellOrder
        SellOrder storage sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];

        // Step3: Check the condition: Execution Time
        // @DEV: high potential for bad interfaces if not done right
        checkTimeCondition(sellOrder.executionTime);

        // Step4: Check if interface has enough funds to sell on the Dutch Exchange
        require(
            ERC20(sellOrder.sellToken).balanceOf(address(this)) >= sellOrder.sellAmount,
            "GelatoDutchX.execDepositAndSell: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );


        // Step5: initialise multi-use variables
        // ********************** Load variables from storage and initialise them **********************
        address sellToken = sellOrder.sellToken;
        address buyToken = sellOrder.buyToken;
        uint256 sellAmount = sellOrder.sellAmount;
        // ********************** Load variables from storage and initialise them END **********************


        // Step6: Fetch auction specific data from Dutch Exchange
        // ********************** Fetch data from dutchExchange **********************
        uint256 currentAuctionIndex = dutchExchange.getAuctionIndex(sellToken, buyToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Fetch data from dutchExchange END **********************


        // Step7: Find the auction index into which the seller's funds will flow
        bool newAuctionIsWaiting;
        // The index of the auction that the sellAmount will actually flow to
        uint256 nextParticipationAuctionIndex;
        // Check if we are in a Waiting period or auction running period
        if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
            // We are in waiting period
            newAuctionIsWaiting = true;
            // SellAmount will go into sellVolumesCurrent
            nextParticipationAuctionIndex = currentAuctionIndex;
        } else if (auctionStartTime < now) {
            // Auction is currently ongoing
            newAuctionIsWaiting = false;
            // SellAmount will go into sellVolumesNext
            nextParticipationAuctionIndex = currentAuctionIndex.add(1);
        }


        // Step8: Get the seller's order State from the orderStateId for Step9 checks
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState storage orderState = orderStates[orderStateId];


        // ************ Step 9: Check auction Index and call depositAndSell: ************
        // Goal: prevent doubly participating in same auction
        // CASE 1: DONT SELL - EDGE CASE: indices out of sync
        // Ensure that currentAuctionIndex is at most 1 below lastParticipatedAuctionIndex
        // The 'if' is to avoid an underflow for default 0 lastParticipatedAuctionIndex
        if (orderState.lastParticipatedAuctionIndex > 0) {
            require(currentAuctionIndex >= orderState.lastParticipatedAuctionIndex.sub(1),
                "GelatoDutchX.execDepositAndSell Case 1: Fatal error, Gelato auction index ahead of dutchExchange auction index"
            );
        }

        // CASE 2: DEPENDS
        // We already have funds attributed to the currentAuctionIndex
        if (currentAuctionIndex == orderState.lastParticipatedAuctionIndex) {
            // Case 2a - SELL: our funds went into the currentAuctionIndex but since they were invested
            //  during its waiting period (orderState.lastAuctionWasWaiting) and that auction has started
            //  in the meantime (!newAuctionIsWaiting) we can sell into sellVolumesNext.
            if (orderState.lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastParticipatedAuctionIndex = nextParticipationAuctionIndex;

                // Update sellOrder.sellAmount so when an executor calls execWithdraw,
                // the seller receives withdraws the correct sellAmount given sellAmountMinusFee
                uint256 dutchXFee;
                (sellOrder.sellAmount, dutchXFee) = _calcActualSellAmount(sellAmount);

                emit LogActualSellAmount(_executionClaimId,
                                        sellAmount,
                                        sellOrder.sellAmount,
                                        dutchXFee
                );

                // Mark sellOrder as posted
                sellOrder.posted = true;
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(sellToken, buyToken, sellAmount);
            }
            // Case 2b - DONT SELL: because either we would doubly invest during same waiting period or
            //  we have an auction index out of sync error.
            else
            {
                revert("Case2b: seller's sellerBalances already exist at the current auction index OR auction index sync error");
            }

        }

        // CASE 3: SELL - last participated auction has cleared
        // Our funds went into the previous auction index
        // We can now sell again into the current auction index.
        else if (currentAuctionIndex > orderState.lastParticipatedAuctionIndex) {
            // ### EFFECTS ###
            // Update Order State
            orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
            orderState.lastParticipatedAuctionIndex = nextParticipationAuctionIndex;

            // Update sellOrder.sellAmount so when an executor calls execWithdraw,
            // the seller receives withdraws the correct sellAmount given sellAmountMinusFee
            uint256 dutchXFee;
            (sellOrder.sellAmount, dutchXFee) = _calcActualSellAmount(sellAmount);

            emit LogActualSellAmount(_executionClaimId,
                                     sellAmount,
                                     sellOrder.sellAmount,
                                     dutchXFee
            );

            // Mark sellOrder as posted
            sellOrder.posted = true;
            // ### EFFECTS END ###

            // INTERACTION: sell on dutchExchange
            _depositAndSell(sellToken, buyToken, sellAmount);
        }

        // CASE 4: DONT SELL - EDGE CASE: unhandled errors
        else {
            revert("GelatoDutchX.execDepositAndSell Case4: Fatal Error: Case4 unforeseen");
        }
        // ********************** Step9: Check auction Index and call depositAndSell END **********************

        // Step8:  Check if interface still has sufficient balance on core. If not, add balance. If yes, skipp.
        automaticTopUp();
    }
    // **************************** IcedOut execute(executionClaimId) END *********************************

    // DELETE
    // ****************************  execWithdraw(executionClaimId) *********************************
    // Withdraw function executor will call
    function execWithdraw(uint256 _executionClaimId)
        public
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoDutchX.execWithdraw: msg.sender != gelatoCore instance address"
        );

        // Fetch owner of execution claim
        address seller = gelatoCore.ownerOf(_executionClaimId);

        // Step2: Create memory pointer for the individual sellOrder and the parent orderState
        // Fetch SellOrder
        SellOrder memory sellOrder = sellOrders[_executionClaimId][_executionClaimId - 1];
        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState memory orderState = orderStates[orderStateId];

        // CHECKS
        // Require that we actually posted the sellOrder prior to calling withdraw
        require(sellOrder.posted,
            "GelatoDutchX.execWithdraw: Sell Order must have been posted in order to withdraw"
        );

        // DEV use memory value  & sellAmountAfterFee as we already updated storage values
        uint256 sellAmount = sellOrder.sellAmount;

        // delete sellOrder
        delete sellOrders[_executionClaimId][_executionClaimId - 1];

        // Calculate withdraw sellAmount
        uint256 withdrawAmount = _withdraw(seller,
                                           sellOrder.sellToken,
                                           sellOrder.buyToken,
                                           orderState.lastParticipatedAuctionIndex,
                                           sellAmount //Actual sellAmount posted
        );

        // Event emission
        emit LogWithdrawComplete(_executionClaimId,
                                 orderStateId,
                                 seller,
                                 sellOrder.buyToken,
                                 sellAmount,
                                 withdrawAmount
        );

        // Delete OrderState struct when last withdrawal completed
        // if (orderState.remainingWithdrawals == 0) {
        //     delete orderStates[orderStateId];
        //     emit LogOrderCompletedAndDeleted(orderStateId);
        // }
    }
    // ****************************  execWithdraw(executionClaimId) END *********************************


    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel heloer on IcedOut.sol
    // DELETE
    function cancelOrder(uint256 _executionClaimId)
        public
    {
        // Step1: Find out if claim id is for execDepositAndSell or execWithdraw
        // Check if it is the former
        SellOrder memory sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];

        // #### CHECKS ####
        // If the posted == true, we know it must be a withdrawClaim, which cannot be cancelled
        require(sellOrder.posted == false,
            "GelatoDutchX.cancelOrder: Only executionClaims that havent been executed yet can be cancelled"
        );
        // You cannot cancel standalone execWithdrawClaims - they have to be withdrawn Manually
        require(sellOrder.sellAmount != 0,
            "GelatoDutchX.cancelOrder: Only execDepositAndSell executionClaims can be cancelled directly"
        );

        address seller = gelatoCore.ownerOf(_executionClaimId);

        // Only Execution Claim Owner can cancel
        require(msg.sender == seller, "Only the executionClaim Owner can cancel the execution");
        // #### CHECKS END ####

        // CHECKS: msg.sender == executionClaimOwner is checked by Core

        // ****** EFFECTS ******
        // Cancel both execution Claims on core
        // ** Gelato Core interactions **
        gelatoCore.cancelExecutionClaim(_executionClaimId);
        gelatoCore.cancelExecutionClaim(_executionClaimId.add(1));
        // ** Gelato Core interactions END **

        // This deletes the withdraw struct as well as they both map to the same struct
        // delete sellOrder
        delete sellOrders[_executionClaimId + 1][_executionClaimId];

        // Emit cancellation event
        emit LogOrderCancelled(_executionClaimId, sellOrder.orderStateId, seller);
        emit LogOrderCancelled(_executionClaimId.add(1), sellOrder.orderStateId, seller);
        // ****** EFFECTS END ******

        // ****** INTERACTIONS ******
        // Refunds seller's eth prepayment for the two linked executionClaims
        msg.sender.transfer(sellOrder.prepaymentPerSellOrder.mul(2));
        // Transfer ERC20 Tokens back to seller
        ERC20(sellOrder.sellToken).safeTransfer(msg.sender, sellOrder.sellAmount);
        // ****** INTERACTIONS END ******
    }

    // Allows manual withdrawals on behalf of a seller from any calling address
    // @DEV: Gas Limit Change => Hardcode
    // DELETE
    function withdrawManually(uint256 _executionClaimId)
        external
    {
        // Fetch owner of execution claim
        address seller = gelatoCore.ownerOf(_executionClaimId);

        // Fetch SellOrder
        SellOrder memory sellOrder = sellOrders[_executionClaimId][_executionClaimId - 1];

        // DEV use memory value  & sellAmountAfterFee as we already updated storage values
        uint256 sellAmount = sellOrder.sellAmount;

        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState memory orderState = orderStates[orderStateId];

        // ******* CHECKS *******
        // If sellAmount == 0, struct has already been deleted
        require(sellAmount != 0, "GelatoDutchX.withdrawManually: Amount for manual withdraw cannot be zero");
        // Only Execution Claim Owner can withdraw manually
        require(msg.sender == seller, "GelatoDutchX.withdrawManually: Only the executionClaim Owner can cancel the execution");
        // Check whether posted == true
        require(sellOrder.posted == true, "GelatoDutchX.withdrawManually: Sell Order must have been posted in order to withdraw");

        // Fetch price of last participated in and cleared auction using
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(sellOrder.sellToken,
                                                 sellOrder.buyToken,
                                                 orderState.lastParticipatedAuctionIndex
        );

        // Require that the last auction the seller participated in has cleared
        require(den != 0,
            "GelatoDutchX.withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
        );
        // ******* CHECKS END *******

        // ******* EFFECTS *******
        // Delete sellOrder Struct
        delete sellOrders[_executionClaimId][_executionClaimId - 1];
        // ******* EFFECTS END*******

        // ******* INTERACTIONS *******
        // Cancel execution claim on core
        gelatoCore.cancelExecutionClaim(_executionClaimId);

        // Initiate withdraw
        _withdraw(seller,  // seller
                  sellOrder.sellToken,
                  sellOrder.buyToken,
                  orderState.lastParticipatedAuctionIndex,
                  sellAmount
        );
        // ******* INTERACTIONS END *******
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

        // Calc fee sellAmount
        dutchXFee = _subOrderSize.mul(num).div(den);

        // Calc actual Sell Amount
        actualSellAmount = _subOrderSize.sub(dutchXFee);
    }

    // Deposit and sell on the dutchExchange
    function _depositAndSell(address _sellToken,
                             address _buyToken,
                             uint256 _amountPerSellOrder
    )
        private
    {
        // Approve DutchX to transfer the funds from gelatoInterface
        ERC20(_sellToken).approve(address(dutchExchange), _amountPerSellOrder);

        // DEV deposit and sell on the dutchExchange
        dutchExchange.depositAndSell(_sellToken, _buyToken, _amountPerSellOrder);
    }

    // Internal fn that withdraws funds from dutchExchange to the sellers account
    function _withdraw(address _seller,
                       address _sellToken,
                       address _buyToken,
                       uint256 _lastParticipatedAuctionIndex,
                       uint256 _sellAmountAfterFee
    )
        private
        returns(uint256 withdrawAmount)
    {
        // Calc how much the sellAmount of buy_tokens received in the previously participated auction
        withdrawAmount = _calcWithdrawAmount(_sellToken,
                                             _buyToken,
                                             _lastParticipatedAuctionIndex,
                                             _sellAmountAfterFee
        );

        // Withdraw funds from dutchExchange to Gelato
        // DEV uses memory value  in case execute func calls it as we already incremented storage value
        dutchExchange.claimAndWithdraw(_sellToken,
                                       _buyToken,
                                       address(this),
                                       _lastParticipatedAuctionIndex,
                                       withdrawAmount
        );

        // Transfer Tokens from GelatoDutchX to Seller
        ERC20(_buyToken).safeTransfer(_seller, withdrawAmount);
    }

    // DEV Calculates sellAmount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken,
                                 address _buyToken,
                                 uint256 _lastParticipatedAuctionIndex,
                                 uint256 _sellAmountAfterFee
    )
        public
        returns(uint256 withdrawAmount)
    {
        // Fetch numerator and denominator from dutchExchange
        uint256 num;
        uint256 den;

        // FETCH PRICE OF CLEARED ORDER WITH INDEX
        // num: buyVolumeOpp || den: sellVolumeOpp
        // Ex: num = 1000, den = 10 => 1WETH === 100RDN
        (num, den) = dutchExchange.closingPrices(_sellToken,
                                                 _buyToken,
                                                 _lastParticipatedAuctionIndex
        );

        // Check if the last auction the seller participated in has cleared
        // DEV Check line 442 in dutchExchange contract
        // DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0,
            "GelatoDutchX._calcWithdrawAmount: den != 0, Last auction did not clear thus far, you have to wait"
        );

        emit LogWithdrawAmount(_sellToken,
                               _buyToken,
                               _lastParticipatedAuctionIndex,
                               num,
                               den,
                               _sellAmountAfterFee.mul(num).div(den)
        );

        // Callculate withdraw sellAmount
        withdrawAmount = _sellAmountAfterFee.mul(num).div(den);
    }
    // **************************** Helper functions END *********************************

}


