pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import './GelatoCore.sol';
import './base/Counters.sol';
import './base/ERC20.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';


/* @Notice: 1 "subOrder" = 1 bundled GelatoCore ExecutionClaim to:
    * depositAndSell() on the DutchX
    * claimAndWithdraw() from the DutchX
To be executed by Gelato Execution Service on the end users behalf
*/


contract GelatoDutchX is Ownable, IGEI0, SafeTransfer {

    // Libraries used:
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _sellOrderIds;

    struct SellOrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        uint256 remainingSubOrders;  // default: == numSubOrders
        uint256 actualLastSubOrderAmount;  // default: 0
    }


    // **************************** Events ******************************
    event LogNewSellOrderCreated(uint256 indexed sellOrderId, address indexed seller);
    // We should also emit uint256 indexed executionClaimId BUT stackToDeep
    event LogNumDen(uint256 num, uint256 den);
    // We should also emit uint256 indexed executionClaimId BUT stackToDeep
    event LogActualSubOrderAmount(uint256 subOrderAmount,
                                  uint256 actualSubOrderAmount,
                                  uint256 fee
    );
    // Stack too deep
    /*event LogPostSubOrderExecution(uint256 indexed executionClaimId,
                                   address indexed executionClaimOwner
    );*/
    // **************************** Events END ******************************


    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    GelatoCore public gelatoCore;
    DutchExchange public dutchExchange;

    // sellOrderId => SellOrderState struct
    mapping(uint256 => SellOrderState) public sellOrderStates;

    // Seller => array of sellOrderId(s)
    mapping(address => uint256[]) public sellOrdersBySeller;

    // Constants that are set during contract construction and updateable via setters
    uint256 public auctionStartWaitingForFunding;

    // **************************** State Variables END ******************************


    /* constructor():
        * constructs Ownable base and sets msg.sender as owner.
        * connects the contract interfaces to deployed instances thereof.
        * sets the state variable constants
    */
    constructor(address _GelatoCore, address _DutchExchange)
        public
    {
        gelatoCore = GelatoCore(_GelatoCore);
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
        returns (uint256 sellOrderId)

    {
        // @DEV: capping number of sub orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs

        // Step1: 0 values prevention
        // Further prevention of zero values is done in Gelato gelatoCore protocol
        require(_totalSellVolume != 0, "totalSellVolume cannot be 0");
        require(_numSubOrders != 0, "numSubOrders cannot be 0");
        require(_intervalSpan != 0, "Interval Span cannot be 0");

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
            "splitSellOrder: totalOrderVolume != numChildOrders * childOrderSize"
        );


        // Step3: Transfer the totalSellVolume from msg.sender(seller) to GelatoInterface
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _totalSellVolume, true),
            "splitSellOrder: The transfer of sellTokens must succeed"
        );


        // Step4: Instantiate new dutchExchange-specific sell order state
        SellOrderState memory sellOrderState = SellOrderState(
            false,  // default: lastAuctionWasWaiting
            0,  // default: lastAuctionIndex
            _numSubOrders,  // default: remainingSubOrders
            0  // default: actualLastSubOrderAmount
        );


        // Step5: give sellOrderId: yields core protocol's parentOrderId
        // Increment the current sellOrderId
        Counters.increment(_sellOrderIds);
        // Get a new, unique sellOrderId for the newly created Sell Order
        sellOrderId = _sellOrderIds.current();


        // Prevent overwriting stored sub orders because of hash collisions
        if (sellOrderStates[sellOrderId].remainingSubOrders != 0) {
            revert("splitSellOrder: Identical sellOrders disallowed");
        }


        // Step6: Update GelatoDutchX state variables
        sellOrderStates[sellOrderId] = sellOrderState;
        sellOrdersBySeller[msg.sender].push(sellOrderId);


        // Step7: Fetch the gelatoFeePerSubOrder from the core protocol
        // The gelatoFeePerSubOrder is for the sellOrder posting on AND withdrawal from the DutchX
        //  ***** GELATO CORE PROTOCOL INTERACTION *****
        // uint256 gelatoFeePerSubOrder = ;
        //  *** GELATO CORE PROTOCOL INTERACTION END ***


        // Step8: Create all subOrders and transfer the gelatoFeePerSubOrder
        uint256 executionTime = _executionTime;
        for (uint256 i = 0; i < _numSubOrders; i++) {
            //  ***** GELATO CORE PROTOCOL INTERACTION *****
            // Call Gelato gelatoCore protocol's mintClaim() function transferring
            //  the fee for claimType-0 for each suborder
            gelatoCore.mintExecutionClaim.value(gelatoCore.calcPrepaidExecutionFee())(sellOrderId,
                                                                                      msg.sender,  // trader/claimOwner
                                                                                      _sellToken,
                                                                                      _buyToken,
                                                                                      _subOrderSize,
                                                                                      _executionTime
            );
            //  *** GELATO CORE PROTOCOL INTERACTION END ***

            // Increment the execution time
            executionTime += _intervalSpan;
        }


        // Step9: Emit New Sell Order to find to its suborder constituents on the core protocol
        emit LogNewSellOrderCreated(sellOrderId, msg.sender);
    }
    // **************************** splitSellOrder() END ******************************



    // **************************** execPostSubOrder()  *********************************
    function execPostSubOrder(uint256 _executionClaimId)
        public
    {
        // Step1: get subOrder to be executed from gelatoCore
        (address gelatoInterface,
         bool pending,
         uint256 sellOrderId,
         address executionClaimOwner,
         address sellToken,
         address buyToken,
         uint256 subOrderSize,
         uint256 executionTime,
         uint256 gelatoFeePerSubOrder) = gelatoCore.getExecutionClaim(_executionClaimId);
        // Ensure that the executionClaim is linked to this interface
        require(gelatoInterface == address(this),
            "executeSubOrder: gelatoInterface != address(this)"
        );
        // Ensure that the executionClaim is pending
        require(pending, "execPostSubOrder: executionClaim is not pending");


        // Step2: point to sellOrderState in storage. This gets updated later.
        SellOrderState storage sellOrderState = sellOrderStates[sellOrderId];

        // Local variables for readability
        address payable executor = msg.sender;
        bool lastAuctionWasWaiting = sellOrderState.lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex = sellOrderState.lastAuctionIndex;  // default: 0
        // SubOrderAmount - fee paid to the dutchExchange of last executed sellOrderState

        // @DEV Unused as of now
        // uint256 actualLastSubOrderAmount = sellOrderState.actualLastSubOrderAmount;  // default: 0


        // ********************** Step3: Basic Execution Logic **********************
        /* Step4: Basic Execution Logic
            * Require that sellOrderState is ready to be executed based on time
            * Require that seller has ERC20 balance
            * Require that Gelato has matching seller's ERC20 allowance
        */
        // Execute if: It's executionTime !
        require(executionTime <= now,
            "Failed: You called before scheduled execution time"
        );
        // Execute if: Gelato has the balance.
        require(
            ERC20(sellToken).balanceOf(gelatoInterface) >= subOrderSize,
            "executeSubOrder: GelatoDutchX balance must be greater than or equal to subOrderSize"
        );
        // ********************** Step3: Basic Execution Logic END **********************


        // ********************** Step4: Fetch data from dutchExchange **********************
        uint256 newAuctionIndex = dutchExchange.getAuctionIndex(buyToken, sellToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Step4: Fetch data from dutchExchange END **********************


        // ********************** Step5: Advanced Execution Logic **********************
        // Define if the new auction is in the Waiting period or not, defaulting to false
        bool newAuctionIsWaiting;

        // Check if we are in a Waiting period or auction running period
        // @Dev, we need to account for latency here
        if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
            newAuctionIsWaiting = true;
        } else if (auctionStartTime < now) {
            newAuctionIsWaiting = false;
        }

        /* Assumptions:
            * 1: Don't sell in the same auction twice
            @ DEV: Need to Revisit #2
            * 2: Don't sell into an auction before the prior auction you sold into
                  has cleared so we can withdraw safely
        */
        // CASE 1:
        // Check case where lastAuctionIndex is greater than newAuctionIndex
        require(newAuctionIndex >= lastAuctionIndex,
            "Fatal error: Gelato auction index ahead of dutchExchange auction index"
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
                // Store change in Auction Index
                sellOrderState.lastAuctionIndex = newAuctionIndex;

                // Store change in sellOrderState.lastAuctionWasWaiting state
                sellOrderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                // Decrease remainingSubOrders
                sellOrderState.remainingSubOrders = sellOrderState.remainingSubOrders.sub(1);

                // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(executionClaimOwner, sellToken, buyToken, subOrderSize);
            }
            /* Case3b: We sold during previous waiting period, our funds went into auction1, then
            auction1 ran, then auction1 cleared and the auction index was incremented,
            , then a waiting period passed, now we are selling during auction2, our funds
            will go into auction3 */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Store change in Auction Index
                sellOrderState.lastAuctionIndex = newAuctionIndex;

                // Store change in sellOrderState.lastAuctionWasWaiting state
                sellOrderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                // Decrease remainingSubOrders
                sellOrderState.remainingSubOrders = sellOrderState.remainingSubOrders.sub(1);

                // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(executionClaimOwner, sellToken, buyToken, subOrderSize);
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
            // Store change in Auction Index
            sellOrderState.lastAuctionIndex = newAuctionIndex;

            // Store change in sellOrderState.lastAuctionWasWaiting state
            sellOrderState.lastAuctionWasWaiting = newAuctionIsWaiting;

            // Decrease remainingSubOrders
            sellOrderState.remainingSubOrders = sellOrderState.remainingSubOrders.sub(1);

            // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
            // Store the actually sold sub-order amount in the struct
            sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
            // ### EFFECTS END ###

            // INTERACTION: sell on dutchExchange
            _depositAndSell(executionClaimOwner, sellToken, buyToken, subOrderSize);
        }
        // Case 5: Unforeseen stuff
        else {
            revert("Case5: Fatal Error: Case5 unforeseen");
        }
        // ********************** Step5: Advanced Execution Logic END **********************


        //@Dev: because one ExecutionClaim of GelatoDutchX encapsulates 1 depositAndSell() and
        //  1 claimAndWithdraw() execution, we DO NOT pay the executor out just yet.
        // The executor receives its payout AFTER it has executed BOTH executable functions.
        // The gelatoCore.payExecutor() function also sets the ExecutionClaim to not-pending (complete).
        // Thus, for GelatoDutchX-type ExecutionClaims, we should only call gelato.payExecutor() AFTER
        //  the withdrawal has been executed.

        // Thus the ExecutionClaim on GelatoCore remains pending after execPostSubOrder()
        // And the (trusted) Gelato Execution Service can handle the logic, to execute the second
        // executable function (withdrawal) and complete this GelatoDutchX-type ExecutionClaim, off-chain.
        // E.g. this ExecutionClaim remains pending in the Executor Nodes database and the executor nodes
        //  listen to the DutchX to determine when the auction for this ExecutionClaim has cleared and
        //  thus execWithdrawSubOrder() can be executed.

        // Optional Step-Stack too deep:: We could somehow also signal on GelatoCore that
        //  the first part of the ExecutionClaim has been executed like so:

        // gelatoCore.updateExecutionTime(_executionClaimId, now + 1 minutes);

        // now + 1 minutes is arbitrary. We could also try to approximate the
        //  time at which the ExecutionClaim becomes withdrawable on the DutchX
        //  and thus execWithdrawSubOrder can be executed.
        // In any case, this fires the updateExecutionTime event on GelatoCore
        //  which our ExecutionService could listen to on GelatoCore, filtering for the
        //  GelatoDutchX interface, and use this event to update the pending Claim in
        //  its database to status: awaiting withdrawal execution or the likes.
        // Executor Nodes might similarly achieve this by listening to the LogPostSubOrderExecution
        //  event on the GelatoDutchX interface directly.

        // Step6-Stack too deep: Event emissions execution function claim was executed
        // emit LogPostSubOrderExecution(_executionClaimId, executionClaimOwner);


        // Step7: return success
        // return true;
    }
    // **************************** execPostSubOrder() END *********************************


    // @DEV TO DO:
    // **************************** execWithdrawSubOrder()  *********************************
    function execWithdrawSubOrder(uint256 _executionClaimId)
        public
        returns (bool)
    {
        address payable executor = msg.sender;


        // @DEV: WE NEED TO PAYOUT EXECUTOR AFTER BOTH POST AND WITHDRAWAL HAVE BEEN EXECUTED
        // Then the ExecutionClaim is set to not-pending (complete) on GelatoCore
        // ********************** StepX-1: ExecutorReward Transfer  ********************
        //  ***** GELATO CORE PROTOCOL INTERACTION *****
        gelatoCore.payExecutor(executor, _executionClaimId);
        //  ***** GELATO CORE PROTOCOL INTERACTION END *****
        // ********************** StepX-1: ExecutorReward Transfer END ****************


        // StepX
        return true;
    }
    // **************************** execWithdrawSubOrder() END *********************************



    // Helper Functions
    // Calculate sub order size accounting for current dutchExchange liquidity contribution fee.
    function _calcActualSubOrderSize(uint256 _sellAmount)
        public
        returns(uint256)
    {
        // Get current fee ratio of Gelato contract
        uint256 num;
        uint256 den;

        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = dutchExchange.getFeeRatio(address(this));

        // Calc fee amount
        uint256 fee = _sellAmount.mul(num).div(den);

        emit LogNumDen(num, den);

        // Calc actual Sell Amount
        uint256 actualSellAmount = _sellAmount.sub(fee);

        emit LogActualSubOrderAmount(_sellAmount, actualSellAmount, fee);
    }

    // Deposit and sell on the dutchExchange
    function _depositAndSell(address _seller,
                             address _sellToken,
                             address _buyToken,
                             uint256 _subOrderSize
    )
        private
        returns(bool)
    {
        // @DEV: before selling, transfer the ERC20 tokens from the user to the gelato contract
        ERC20(_sellToken).transferFrom(_seller, address(this), _subOrderSize);

        // @DEV: before selling, approve the dutchExchange to extract the ERC20 Token from this contract
        ERC20(_sellToken).approve(address(dutchExchange), _subOrderSize);

        // @DEV deposit and sell on the dutchExchange
        dutchExchange.depositAndSell(_sellToken, _buyToken, _subOrderSize);

        return true;
    }


    // Fallback function: reverts incoming ether payments not addressed to a payable function
    function() external payable {
        revert("Should not send ether to GelatoDutchX without calling one of its payable public functions");
    }


    // Deprecated Withdrawal functions
    /*function withdrawManually(bytes32 _sellOrderId)
        public
    {
        SellOrderState storage sellOrderState = sellOrders[_sellOrderId];

        // Check if msg.sender is equal seller
        // @Kalbo: Do we really need that or should we make everyone be able to withdraw on behalf of a user?
        require(msg.sender == executionClaimOwner, 'Only the seller of the sellOrderState can call this function');

        // Check if tx executor hasnt already withdrawn the funds
        require(sellOrderState.remainingSubOrders.add(1) == sellOrderState.remainingWithdrawals, 'Your funds from the last cleared auction you participated in were already withdrawn to your account');

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;

        // Ex: num = 1, den = 250
        (num, den) = dutchExchange.closingPrices(sellToken, buyToken, sellOrderState.lastAuctionIndex);
        // Check if the last auction the seller participated in has cleared

        // @DEV Check line 442 in dutchExchange contract
        require(den != 0, 'Last auction did not clear thus far, you have to wait');

        // Mark withdraw as completed
        sellOrderState.remainingWithdrawals = sellOrderState.remainingWithdrawals.sub(1);

        // Initiate withdraw
        _withdraw(executionClaimOwner, sellToken, buyToken, sellOrderState.lastAuctionIndex, sellOrderState.actualLastSubOrderAmount);
    }*/


    /* Internal func that withdraws funds from dutchExchange to the sellers account
    function _withdraw(address _seller, address _sellToken, address _buyToken, uint256 _lastAuctionIndex, uint256 _actualLastSubOrderAmount)
        public
    {
        // Calc how much the amount of buy_tokens received in the previously participated auction
        uint256 withdrawAmount = _calcWithdrawAmount(_sellToken, _buyToken, _lastAuctionIndex, _actualLastSubOrderAmount);

        // Withdraw funds from dutchExchange to Gelato
        // @DEV uses memory value lastAuctionIndex in case execute func calls it as we already incremented storage value
        dutchExchange.claimAndWithdraw(_sellToken, _buyToken, address(this), _lastAuctionIndex, withdrawAmount);

        // Transfer Tokens from Gelato to Seller
        // ERC20.transfer(address recipient, uint256 amount)
        ERC20(_buyToken).transfer(_seller, withdrawAmount);

        emit LogWithdrawComplete(_seller, withdrawAmount, _buyToken);

    }*/
    // @DEV Calculates amount withdrawable from past, cleared auction

    /* function _calcWithdrawAmount(uint256 _executionClaimId,
                                    address _sellToken,
                                    address _buyToken,
                                    uint256 _lastAuctionIndex,
                                    uint256 _actualLastSubOrderAmount
        )
            public
            returns(uint256 withdrawAmount)
    {
        // Fetch numerator and denominator from dutchExchange
        uint256 num;
        uint256 den;

        // FETCH PRICE OF CLEARED ORDER WITH INDEX lastAuctionIndex
        // Ex: num = 1, den = 250
        (num, den) = dutchExchange.closingPrices(_sellToken, _buyToken, _lastAuctionIndex);

        // Check if the last auction the seller participated in has cleared
        // @DEV Check line 442 in dutchExchange contract
        // @DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0, 'Last auction did not clear thus far, withdrawal cancelled');

        emit LogNumDen(_executionClaimId, num, den);

        uint256 withdrawAmount = _actualLastSubOrderAmount.mul(num).div(den);

        emit LogWithdrawAmount(_executionClaimId, withdrawAmount);

    }*/


    /* Deprecated cancel order function
    function cancelSellOrder(bytes32 sellOrderId)
            public
            returns(bool)
        {
            SellOrderState storage sellOrderState = sellOrderStates[sellOrderId];

            require(!sellOrderState.cancelled,
                "Sell order was cancelled already"
            );
            require(msg.sender == executionClaimOwner,
                "Only seller can cancel the sell order"
            );

            sellOrderState.cancelled = true;

            emit LogSellOrderCancelled(sellOrderId, executionClaimOwner);

            return true;
      }
    */

}


