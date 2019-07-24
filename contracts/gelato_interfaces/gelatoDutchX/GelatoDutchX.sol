pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
import '../../GelatoCore.sol';
import '../../base/Counters.sol';
import '../../base/ERC20.sol';
import '../../base/IcedOut.sol';
import '../../base/Ownable.sol';
import '../../base/SafeMath.sol';


// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
contract GelatoDutchX is IcedOut, Ownable, SafeTransfer {
    // Libraries
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _OrderIds;

    struct OrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        uint256 remainingSubOrders;  // default: == numSubOrders
        uint256 lastSellAmountAfterFee;  // default: 0
        uint256 remainingWithdrawals;
    }


    // **************************** Events ******************************
    event LogNewOrderCreated(uint256 indexed orderId, address indexed seller);
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
    // **************************** Events END ******************************


    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    GelatoCore public gelatoCore;
    DutchExchange public dutchExchange;

    // OrderId => orderState struct
    mapping(uint256 => OrderState) public orderStates;

    // Constants that are set during contract construction and updateable via setters
    uint256 public auctionStartWaitingForFunding;

    // **************************** State Variables END ******************************


    /* constructor():
        * constructs Ownable base and sets msg.sender as owner.
        * connects the contract interfaces to deployed instances thereof.
        * sets the state variable constants
    */
    constructor(address payable _GelatoCore, address _DutchExchange)
        public
    {
        gelatoCore = GelatoCore(_GelatoCore);
        dutchExchange = DutchExchange(_DutchExchange);
        auctionStartWaitingForFunding = 1;
    }


    // Fallback function: reverts incoming ether payments not addressed to a payable function
    function() external payable {
        revert("Should not send ether to GelatoDutchXSplitSellAndWithdraw without specifying a payable function selector");
    }


    // **************************** State Variable Setters ******************************
    function setAuctionStartWaitingForFunding(uint256 _auctionStartWaitingForFunding)
        onlyOwner
        external
    {
        auctionStartWaitingForFunding = _auctionStartWaitingForFunding;
    }
    // **************************** State Variable Setters END ******************************



    // **************************** splitSellOrder() ******************************
    function splitSellOrder(address _sellToken,
                            address _buyToken,
                            uint256 _totalSellVolume,
                            uint256 _numSubOrders,
                            uint256 _subOrderSize,
                            uint256 _executionTime,
                            uint256 _intervalSpan
    )
        public
        payable
        returns (uint256 orderId)

    {
        // DEV: capping number of sub orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs, like it is already done for _intervalSpan.


        // Step1: 0 and restricted value checks
        // Further prevention of zero values is done in Gelato gelatoCore protocol
        require(_totalSellVolume != 0, "splitSellOrder: totalSellVolume cannot be 0");
        require(_numSubOrders != 0, "splitSellOrder: numSubOrders cannot be 0");
        require(_intervalSpan >= 6 hours,
            "splitSellOrder: _intervalSpan not at/above minimum of 6 hours"
        );


        /* Step2: Invariant Requirements
        Handled by dappInterface:
            * 1: subOrderSizes from one Sell Order are constant.
                * totalSellVolume == numSubOrders * subOrderSize.
        Set off-chain (web3) and checked on core protocol:
            * 2: The caller transfers the correct amount of ether as gelato fee endowment
                * msg.value == numSubOrders * gelatoFeePerSubOrder
        */
        // Invariant1: Constant childOrderSize
        require(_totalSellVolume == _numSubOrders.mul(_subOrderSize),
            "splitSellOrder: _totalSellVolume != _numSubOrders * _subOrderSize"
        );


        // Step3: Transfer the totalSellVolume from msg.sender(seller) to this contract
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _totalSellVolume, true),
            "splitSellOrder: The transfer of sellTokens from msg.sender to Gelato Interface must succeed"
        );


        // Step4: Instantiate new dutchExchange-specific sell order state
        OrderState memory orderState = OrderState(
            false,  // default: lastAuctionWasWaiting
            0,  // default: lastAuctionIndex
            _numSubOrders,  // default: remainingSubOrders
            0,  // default: lastSellAmountAfterFee
            _numSubOrders  //  default: remainingWithdrawals
        );


        // Step5: give OrderId: yields core protocol's parentOrderId
        // Increment the current OrderId
        Counters.increment(_OrderIds);
        // Get a new, unique OrderId for the newly created Sell Order
        orderId = _OrderIds.current();


        // Step6: Update GelatoDutchX state variables
        orderStates[orderId] = orderState;


        // Step7: Create all subOrders and transfer the gelatoFeePerSubOrder
        for (uint256 i = 0; i < _numSubOrders.add(1); i++) { //.add(1)=last withdrawal
            //  ***** GELATO CORE PROTOCOL INTERACTION *****
            // Call Gelato gelatoCore protocol's mintClaim() function transferring
            //  the prepaid fee for each minted Claim.
            // msg.sender == seller/user/claimOwner
            gelatoCore.mintExecutionClaim
                .value(gelatoCore.calcPrepaidExecutionFee())
                (msg.sender, orderId, _sellToken, _buyToken, _subOrderSize, _executionTime.add(_intervalSpan.mul(i)));
            //  *** GELATO CORE PROTOCOL INTERACTION END ***
        }


        // Step8: Emit New Sell Order to find its suborder constituent claims on the Core
        emit LogNewOrderCreated(orderId, msg.sender);
    }
    // **************************** splitSellOrder() END ******************************



    // **************************** IcedOut execute(executionClaimId) *********************************
    /**
     * DEV: For the GelDutchXSplitSellAndWithdraw interface the IcedOut execute fn does this:
     * First: it tries to post the subOrder on the DutchExchange via depositAndSell()
     * Then (depends on orderState): it attempts to claimAndWithdraw() previous subOrders from the DutchExchange
     * Finally (depends on orderState): it deletes the orderState from this Gelato Interface contract.
     */
    function execute(uint256 _executionClaimId)
        external
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoInterface.execute: msg.sender != gelatoCore instance address"
        );
        // Ensure that the executionClaim on the Core is linked to this Gelato Interface
        require(gelatoCore.getClaimInterface(_executionClaimId) == address(this),
            "GelatoInterface.execute: gelatoCore.getClaimInterface(_executionClaimId) != address(this)"
        );


        // Step2: fetch from gelatoCore and initialise multi-use variables
        address seller = gelatoCore.ownerOf(_executionClaimId);
        uint256 orderId = gelatoCore.getInterfaceOrderId(_executionClaimId);
        (address sellToken, address buyToken) = gelatoCore.getClaimTokenPair(_executionClaimId);
        uint256 sellAmount = gelatoCore.getClaimSellAmount(_executionClaimId);


        // ********************** Step3: Basic Execution Logic **********************
        /* Step3: Basic Execution Logic
            * Handled by Gelato Core
                * Require that order is ready to be executed based on time
            * Handled by this Gelato Interface
                * Require that this Gelato Interface has the ERC20 to be sold
                   in its ERC20 balance.
        */
        // DEV: delete if stack too deep
        require(
            ERC20(sellToken).balanceOf(address(this)) >= gelatoCore.getClaimSellAmount(_executionClaimId),
            "GelatoInterface.execute: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );
        // ********************** Step3: Basic Execution Logic END **********************


        // ********************** Step4: Load variables from storage and initialise them **********************
        // Step4:
        // the last DutchX auctionIndex at which the orderId participated in
        OrderState storage orderState = orderStates[orderId];

        uint256 lastAuctionIndex = orderState.lastAuctionIndex;  // default: 0
        // SubOrderAmount - DutchXFee of last executed subOrder
        uint256 lastSellAmountAfterFee = orderState.lastSellAmountAfterFee;
        // How many executions are left
        uint256 remainingSubOrders = orderState.remainingSubOrders;
        // ********************** Step4: Load variables from storage and initialise them END **********************


        // ********************** Step5: Fetch data from dutchExchange **********************
        uint256 newAuctionIndex = dutchExchange.getAuctionIndex(buyToken, sellToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Step5: Fetch data from dutchExchange END **********************


        // ********************** Step6: Advanced Execution Logic **********************
        // Only enter if there are remainingSubOrders to be executed
        if (remainingSubOrders >= 1) {
            // Waiting Period variables needed to prevent double participation in DutchX auctions
            bool lastAuctionWasWaiting = orderState.lastAuctionWasWaiting;  // default: false
            bool newAuctionIsWaiting;
            // Check if we are in a Waiting period or auction running period
            if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
                newAuctionIsWaiting = true;
            } else if (auctionStartTime < now) {
                newAuctionIsWaiting = false;
            }

            /* Assumptions:
                * 1: Don't sell in the same auction twice
                * 2: Don't sell into an auction before the prior auction you sold into
                      has cleared so we can withdraw safely without prematurely overwriting
                      the OrderState values that must be shared between consecutive subOrders.
            */
            // CASE 1:
            // Check case where lastAuctionIndex is greater than newAuctionIndex
            require(newAuctionIndex >= lastAuctionIndex,
                "Case 1: Fatal error, Gelato auction index ahead of dutchExchange auction index"
            );

            // CASE 2:
            // Either we already sold during waitingPeriod OR during the auction that followed
            if (newAuctionIndex == lastAuctionIndex) {
                // Case2a: Last sold during waitingPeriod1, new CANNOT sell during waitingPeriod1.
                if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                    revert("Case2a: Last sold during waitingPeriod1, new CANNOT sell during waitingPeriod1");
                }
                /* Case2b: We sold during waitingPeriod1, our funds went into auction1,
                now auction1 is running, now we DO NOT sell again during auction1, even
                though this time our funds would go into auction2. But we wait for
                the auction index to be incremented */
                else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                    // Given new assumption of not wanting to sell in newAuction before lastAuction sold-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
                    revert("Case2b: Selling again before the lastAuction participation cleared disallowed");
                }
                /* Case2c Last sold during running auction1, new tries to sell during waiting period
                that preceded auction1 (impossible time-travel) or new tries to sell during waiting
                period succeeding auction1 (impossible due to auction index incrementation ->
                newAuctionIndex == lastAuctionIndex cannot be true - Gelato-dutchExchange indexing
                must be out of sync) */
                else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                    revert("Case2c: Fatal error: auction index incrementation out of sync");
                }
                // Case2d: Last sold during running auction1, new CANNOT sell during auction1.
                else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                    revert("Case2d: Selling twice into the same running auction is disallowed");
                }
            }
            // CASE 3:
            // We participated at previous auction index
            // Either we sold during previous waiting period, or during previous auction.
            else if (newAuctionIndex == lastAuctionIndex.add(1)) {
                /* Case3a: We sold during previous waiting period, our funds went into auction1,
                then auction1 ran, then auction1 cleared and the auctionIndex got incremented,
                we now sell during the next waiting period, our funds will go to auction2 */
                if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                    // ### EFFECTS ###
                    // Update Order State
                    orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                    orderState.lastAuctionIndex = newAuctionIndex;
                    orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);
                    orderState.lastSellAmountAfterFee = _calcActualSellAmount(sellAmount);
                    // ### EFFECTS END ###

                    // INTERACTION: sell on dutchExchange
                    _depositAndSell(sellToken, buyToken, sellAmount);
                }
                /* Case3b: We sold during previous waiting period, our funds went into auction1, then
                auction1 ran, then auction1 cleared and the auction index was incremented,
                , then a waiting period passed, now we are selling during auction2, our funds
                will go into auction3 */
                else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                    // ### EFFECTS ###
                    // Update Order State
                    orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                    orderState.lastAuctionIndex = newAuctionIndex;
                    orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);
                    orderState.lastSellAmountAfterFee = _calcActualSellAmount(sellAmount);
                    // ### EFFECTS END ###

                    // INTERACTION: sell on dutchExchange
                    _depositAndSell(sellToken, buyToken, sellAmount);
                }
                /* Case3c: We sold during auction1, our funds went into auction2, then auction1 cleared
                and the auction index was incremented, now we are NOT selling during the ensuing
                waiting period because our funds would also go into auction2 */
                else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                    revert("Case3c: Failed: Selling twice during auction and ensuing waiting period disallowed");
                }
                /* Case3d: We sold during auction1, our funds went into auction2, then auction1
                cleared and the auctionIndex got incremented, then a waiting period passed, now
                we DO NOT sell during the running auction2, even though our funds will go to
                auction3 because we only sell after the last auction that we contributed to
                , in this case auction2, has been cleared and its index incremented */
                else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                    // Given new assumption of not wanting to sell in newAuction before lastAuction sold-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
                    revert("Case 3d: Don't sell before last auction seller participated in has cleared");
                }
            }
            // CASE 4:
            // If we skipped at least one auction before trying to sell again: ALWAYS SELL
            else if (newAuctionIndex >= lastAuctionIndex.add(2)) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = newAuctionIndex;
                orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);
                orderState.lastSellAmountAfterFee = _calcActualSellAmount(sellAmount);
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(sellToken, buyToken, sellAmount);
            }
            // Case 5: Unforeseen stuff
            else {
                revert("Case5: Fatal Error: Case5 unforeseen");
            }
        }
        // ********************** Step6: Advanced Execution Logic END **********************


        // ********************** Step 7: Withdraw from DutchX **********************
        // Only enter after first sub-order sale
        // Only enter if last auction the seller participated in has cleared
        // Only enter if seller has not called withdrawManually
        if (lastAuctionIndex != 0 && orderState.remainingWithdrawals == remainingSubOrders.add(1) )
        {
            // Mark withdraw as completed
            orderState.remainingWithdrawals = orderState.remainingWithdrawals.sub(1);

            // DEV use memory value lastAuctionIndex & sellAmountAfterFee as we already updated storage values
            uint256 withdrawAmount = _withdraw(seller,
                                               sellToken,
                                               buyToken,
                                               lastAuctionIndex,
                                               lastSellAmountAfterFee
            );

            // Event emission
            emit LogWithdrawComplete(_executionClaimId,
                                     orderId,
                                     seller,
                                     buyToken,
                                     withdrawAmount
            );

            // Delete OrderState struct when last withdrawal completed
            if (orderState.remainingWithdrawals == 0) {
                delete orderStates[orderId];
                emit LogOrderCompletedAndDeleted(orderId);
            }
        }
        // ********************** Step 7: Withdraw from DutchX END **********************
    }
    // **************************** IcedOut execute(executionClaimId) END *********************************



    // **************************** Helper functions *********************************
    // Calculate sub order size accounting for current dutchExchange liquidity contribution fee.
    function _calcActualSellAmount(uint256 _subOrderSize)
        public
        view
        returns(uint256 actualSellAmount)
    {
        // Get current fee ratio of Gelato contract
        uint256 num;
        uint256 den;
        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = dutchExchange.getFeeRatio(address(this));

        // Calc fee amount
        uint256 fee = _subOrderSize.mul(num).div(den);

        // Calc actual Sell Amount
        actualSellAmount = _subOrderSize.sub(fee);
    }

    // Deposit and sell on the dutchExchange
    function _depositAndSell(address _sellToken,
                             address _buyToken,
                             uint256 _sellAmount
    )
        private
    {
        // DEV: before selling, approve the dutchExchange to extract the ERC20 Token from this contract
        ERC20(_sellToken).approve(address(dutchExchange), _sellAmount);

        // DEV deposit and sell on the dutchExchange
        dutchExchange.depositAndSell(_sellToken, _buyToken, _sellAmount);
    }

    // Internal fn that withdraws funds from dutchExchange to the sellers account
    function _withdraw(address _seller,
                       address _sellToken,
                       address _buyToken,
                       uint256 _lastAuctionIndex,
                       uint256 _sellAmountAfterFee
    )
        public
        returns(uint256 withdrawAmount)
    {
        // Calc how much the amount of buy_tokens received in the previously participated auction
        withdrawAmount = _calcWithdrawAmount(_sellToken,
                                             _buyToken,
                                             _lastAuctionIndex,
                                             _sellAmountAfterFee
        );

        // Withdraw funds from dutchExchange to Gelato
        // DEV uses memory value lastAuctionIndex in case execute func calls it as we already incremented storage value
        dutchExchange.claimAndWithdraw(_sellToken,
                                       _buyToken,
                                       address(this),
                                       _lastAuctionIndex,
                                       withdrawAmount
        );

        // Transfer Tokens from Gelato to Seller
        safeTransfer(_buyToken, _seller, withdrawAmount, false);
    }

    // DEV Calculates amount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken,
                                 address _buyToken,
                                 uint256 _lastAuctionIndex,
                                 uint256 _sellAmountAfterFee
    )
        public
        view
        returns(uint256 withdrawAmount)
    {
        // Fetch numerator and denominator from dutchExchange
        uint256 num;
        uint256 den;

        // FETCH PRICE OF CLEARED ORDER WITH INDEX lastAuctionIndex
        // Ex: num = 1, den = 250
        (num, den) = dutchExchange.closingPrices(_sellToken,
                                                 _buyToken,
                                                 _lastAuctionIndex
        );

        // Check if the last auction the seller participated in has cleared
        // DEV Check line 442 in dutchExchange contract
        // DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0,
            "withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
        );

        withdrawAmount = _sellAmountAfterFee.mul(num).div(den);
    }
    // **************************** Helper functions END *********************************



    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    function cancelOrder(uint256 _executionClaimId)
        public
        returns(bool)
    {
        // get local multi-use variables
        uint256 orderId = gelatoCore.getInterfaceOrderId(_executionClaimId);

        // CHECKS: msg.sender == executionClaimOwner is checked by Core

        // ****** EFFECTS ******
        // Emit event before deletion/burning of relevant variables
        emit LogOrderCancelled(_executionClaimId, orderId, gelatoCore.ownerOf(_executionClaimId));
        /**
         *DEV: cancel the ExecutionClaim via gelatoCore.cancelExecutionClaim(executionClaimId)
         * This has the following effects on the Core:
         * 1) It burns the ExecutionClaim
         * 2) It deletes the ExecutionClaim from the executionClaims mapping
         * 3) It transfers ether as a refund to the executionClaimOwner
         */
        // ** Gelato Core interactions **
        gelatoCore.cancelExecutionClaim(_executionClaimId);
        // ** Gelato Core interactions END **

        // Fetch variables needed before deletion
        address sellToken = gelatoCore.getClaimSellToken(_executionClaimId);
        uint256 sellAmount = gelatoCore.getClaimSellAmount(_executionClaimId);

        // delete the OrderState
        delete orderStates[orderId];
        // ****** EFFECTS END ******

        // INTERACTIONS: transfer sellAmount back from this contracts ERC20 balance to seller
        safeTransfer(sellToken, msg.sender, sellAmount, false);

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
    function withdrawManually(uint256 _executionClaimId)
        external
        returns(bool)
    {
        // Fetch multi-use variables
        uint256 orderId = gelatoCore.getInterfaceOrderId(_executionClaimId);
        (address sellToken, address buyToken) = gelatoCore.getClaimTokenPair(_executionClaimId);

        // Point to storage for writing.
        OrderState storage orderState = orderStates[orderId];

        // **** CHECKS ****
        // Do not allow if last withdrawal as corresponding ExecutionClaim
        //  would need its own executionClaim to be passed in parameters, in order to be
        //  cancelled, as uncancelled it will throw revert upon execution attempt by executor.
        require(orderState.remainingWithdrawals != 1,
            "withdrawManually: manually withdrawing last remaining withdrawal is disallowed."
        );
        // Require that tx executor hasnt already withdrawn the funds
        require(orderState.remainingSubOrders.add(1) == orderState.remainingWithdrawals,
            "withdrawManually: Your funds from the last cleared auction you participated in were already withdrawn to your account"
        );

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(sellToken, buyToken, orderState.lastAuctionIndex);

        // Require that the last auction the seller participated in has cleared
        // DEV Check line 442 in dutchExchange contract
        require(den != 0,
            "withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
        );
        // **** CHECKS END ***

        // **** EFFECTS ****
        // Mark withdraw as completed
        orderState.remainingWithdrawals = orderState.remainingWithdrawals.sub(1);
        // **** EFFECTS END****

        // INTERACTIONS: Initiate withdraw
        _withdraw(gelatoCore.ownerOf(_executionClaimId),  // seller
                  sellToken,
                  buyToken,
                  orderState.lastAuctionIndex,
                  orderState.lastSellAmountAfterFee
        );

        // Success
        return true;
    }
    // **************************** Extra functions END *********************************
}


