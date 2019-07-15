pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import './GelatoCore.sol';
import './base/Counters.sol';
import './base/ERC20.sol';
import './base/IGEI0.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';


// Gelato DutchX Interface for splitting sell orders and automated withdrawals
contract GelDutchXSplitSellAndWithdraw is Ownable, IGEI0, SafeTransfer {

    // Libraries used:
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _OrderIds;

    struct OrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        uint256 remainingSubOrders;  // default: == numSubOrders
        uint256 actualLastSubOrderAmount;  // default: 0
        uint256 remainingWithdrawals;
    }


    // **************************** Events ******************************
    event LogNewSellOrderCreated(uint256 indexed OrderId, address indexed seller);
    // We should also emit uint256 indexed executionClaimId BUT stackToDeep
    event LogNumDen(uint256 num, uint256 den);
    // We should also emit uint256 indexed executionClaimId BUT stackToDeep
    event LogActualSubOrderAmount(uint256 subOrderAmount,
                                  uint256 actualSubOrderAmount,
                                  uint256 fee
    );
    event LogOrderCancelled(uint256 indexed executionClaimId,
                            uint256 indexed orderID,
                            address indexed orderOwner
    );
    // **************************** Events END ******************************


    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    GelatoCore public gelatoCore;
    DutchExchange public dutchExchange;

    // OrderId => orderState struct
    mapping(uint256 => orderState) public orderStates;

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
        // @DEV: capping number of sub orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs, like it is already done for _intervalSpan.


        // Step1: 0 and restricted value checks
        // Further prevention of zero values is done in Gelato gelatoCore protocol
        require(_totalSellVolume != 0, "splitSellOrder: totalSellVolume cannot be 0");
        require(_numSubOrders != 0, "splitSellOrder: numSubOrders cannot be 0");
        require(_intervalSpan >= 24 hours,
            "splitSellOrder: _intervalSpan not above minimum of 24 hours"
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
            "splitSellOrder: totalOrderVolume != numChildOrders * childOrderSize"
        );


        // Step3: Transfer the totalSellVolume from msg.sender(seller) to this contract
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _totalSellVolume, true),
            "splitSellOrder: The transfer of sellTokens from msg.sender to Gelato Interface must succeed"
        );


        // Step4: Instantiate new dutchExchange-specific sell order state
        orderState memory orderState = orderState(
            false,  // default: lastAuctionWasWaiting
            0,  // default: lastAuctionIndex
            _numSubOrders,  // default: remainingSubOrders
            0,  // default: actualLastSubOrderAmount
            0  //  default: remainingWithdrawals
        );


        // Step5: give OrderId: yields core protocol's parentOrderId
        // Increment the current OrderId
        Counters.increment(_OrderIds);
        // Get a new, unique OrderId for the newly created Sell Order
        orderId = _OrderIds.current();


        // Step6: Update GelatoDutchX state variables
        orderStates[orderId] = orderState;


        // Step7: Create all subOrders and transfer the gelatoFeePerSubOrder
        uint256 executionTime = _executionTime;
        for (uint256 i = 0; i < _numSubOrders; i++) {
            //  ***** GELATO CORE PROTOCOL INTERACTION *****
            // Call Gelato gelatoCore protocol's mintClaim() function transferring
            //  the prepaid fee for each minted Claim.
            // msg.sender == seller/user/claimOwner
            gelatoCore.mintExecutionClaim
                .value(gelatoCore.calcPrepaidExecutionFee())
                (msg.sender, orderId, _sellToken, _buyToken, _subOrderSize, _executionTime
            );
            //  *** GELATO CORE PROTOCOL INTERACTION END ***

            // Increment the execution time
            executionTime += _intervalSpan;
        }


        // Step8: Emit New Sell Order to find its suborder constituent claims on the Core
        emit LogNewSellOrderCreated(OrderId, msg.sender);
    }
    // **************************** splitSellOrder() END ******************************



    // **************************** GEI0 execute(executionClaimId) *********************************
    /**
     * @dev: For the GelDutchXSplitSellAndWithdraw interface the GEI0 execute fn does this:
     * First: it tries to post the subOrder on the DutchExchange via depositAndSell()
     * Then (depends on orderState): it attempts to claimAndWithdraw() previous subOrders from the DutchExchange
     * Finally (depends on orderState): it deletes the orderState and OrderId from this Gelato Interface contract.
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

        // Step2
        address seller = gelatoCore.ownerOf(_executionClaimId);
        uint256 orderId = gelatoCore.getInterfaceOrderId(_executionClaimId);
        (address sellToken, address buyToken) = gelatoCore.getClaimTokenPair(_executionClaimId);
        uint256 sellAmount = gelatoCore.getClaimSellAmount(_executionClaimId);

        // Step3: Get storage pointer to read from and write to
        OrderState storage orderState = orderStates[orderId];

        // Local variables
        uint256 lastAuctionIndex = orderState.lastAuctionIndex;  // default: 0
        // SubOrderAmount - fee paid to the DutchX of last executed subOrder
        uint256 actualLastSubOrderAmount = orderState.actualLastSubOrderAmount;
        // How many executions are left
        uint256 remainingSubOrders = order.remainingSubOrders;


        // ********************** Step3: Basic Execution Logic **********************
        /* Step4: Basic Execution Logic
            * Handled by Gelato Core
                * Require that order is ready to be executed based on time
            * Handled by this Gelato Interface
                * Require that seller has ERC20 balance
                * Require that Gelato has matching seller's ERC20 allowance
        */
        // Execute if this Gelato Interface has the balance.
        require(
            ERC20(sellToken).balanceOf(gelatoInterface) >= subOrderSize,
            "GelatoInterface.execute: GelatoInterface's ERC20 balance must be greater than or equal to subOrderSize"
        );
        // ********************** Step3: Basic Execution Logic END **********************


        // ********************** Step4: Fetch data from dutchExchange **********************
        uint256 newAuctionIndex = dutchExchange.getAuctionIndex(buyToken, sellToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Step4: Fetch data from dutchExchange END **********************


        // ********************** Step5: Advanced Execution Logic **********************
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
                    orderState.lastAuctionIndex = newAuctionIndex;

                    // Store change in orderState.lastAuctionWasWaiting state
                    orderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                    // Decrease remainingSubOrders
                    orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);

                    // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
                    // Store the actually sold sub-order amount in the struct
                    orderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
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
                    orderState.lastAuctionIndex = newAuctionIndex;

                    // Store change in orderState.lastAuctionWasWaiting state
                    orderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                    // Decrease remainingSubOrders
                    orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);

                    // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
                    // Store the actually sold sub-order amount in the struct
                    orderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
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
                orderState.lastAuctionIndex = newAuctionIndex;

                // Store change in orderState.lastAuctionWasWaiting state
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                // Decrease remainingSubOrders
                orderState.remainingSubOrders = orderState.remainingSubOrders.sub(1);

                // @DEV: before selling, calc the acutal amount which will be sold after dutchExchange fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                orderState.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrderSize);
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(executionClaimOwner, sellToken, buyToken, subOrderSize);
            }
            // Case 5: Unforeseen stuff
            else {
                revert("Case5: Fatal Error: Case5 unforeseen");
            }
        }
        // ********************** Step5: Advanced Execution Logic END **********************


        // ********************** Withdraw from DutchX **********************
        // Only enter after first sub-order sale
        // Only enter if last auction the seller participated in has cleared
        // Only enter if seller has not called withdrawManually
        if (lastAuctionIndex != 0 && orderState.remainingWithdrawals == remainingSubOrders.add(1) )
        {
            // Mark withdraw as completed
            orderState.remainingWithdrawals = orderState.remainingWithdrawals.sub(1);

            // @DEV use memory value lastAuctionIndex & actualLastSubOrderAmount as we already updated storage values
            _withdraw(seller, sellToken, buyToken, lastAuctionIndex, actualLastSubOrderAmount);
        }
        // ********************** Withdraw from DutchX END **********************


    }
    // **************************** GEI0 execute(executionClaimId) END *********************************



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

    // Internal fn that withdraws funds from dutchExchange to the sellers account
    function _withdraw(address _seller,
                       address _sellToken,
                       address _buyToken,
                       uint256 _lastAuctionIndex,
                       uint256 _actualLastSubOrderAmount
    )
        public
    {
        // Calc how much the amount of buy_tokens received in the previously participated auction
        uint256 withdrawAmount = _calcWithdrawAmount(_sellToken,
                                                     _buyToken,
                                                    _lastAuctionIndex,
                                                    _actualLastSubOrderAmount
        );

        // Withdraw funds from dutchExchange to Gelato
        // @DEV uses memory value lastAuctionIndex in case execute func calls it as we already incremented storage value
        dutchExchange.claimAndWithdraw(_sellToken, _buyToken, address(this), _lastAuctionIndex, withdrawAmount);

        // Transfer Tokens from Gelato to Seller
        // ERC20.transfer(address recipient, uint256 amount)
        ERC20(_buyToken).transfer(_seller, withdrawAmount);
    }

    // @DEV Calculates amount withdrawable from past, cleared auction
    function _calcWithdrawAmount(uint256 _executionClaimId,
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
    }


    // Additional extra functions
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
         *@dev: cancel the ExecutionClaim via gelatoCore.cancelExecutionClaim(executionClaimId)
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

        // INTERACTIONS: transfer sellAmount back from this contracts ERC20 balance to orderOwner
        safeTransfer(sellToken, msg.sender, sellAmount, false);

        // Success
        return true;
    }

    // Allows manual withdrawals on behalf of a seller from any calling address
    // This is allowed also on the GelatoDutchX Automated Withdrawal Interface
    //  because the claim is still executable (postSellOrder) and actually a bit cheaper
    //  to execute now for the executor, as now withdrawal control flow is entered.
    function withdrawManually(uint256 _orderId, uint256 _executionClaimId)
        public
    {
        OrderState storage orderState = orderStates[_orderId];

        // Require that tx executor hasnt already withdrawn the funds
        require(orderState.remainingSubOrders.add(1) == orderState.remainingWithdrawals,
            "withdrawManually: Your funds from the last cleared auction you participated in were already withdrawn to your account"
        );

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;

        // Ex: num = 1, den = 250
        (num, den) = dutchExchange.closingPrices(sellToken, buyToken, orderState.lastAuctionIndex);

        // Require that the last auction the seller participated in has cleared
        // @DEV Check line 442 in dutchExchange contract
        require(den != 0,
            "withdrawManually: Last auction did not clear thus far, you have to wait"
        );

        // Mark withdraw as completed
        orderState.remainingWithdrawals = orderState.remainingWithdrawals.sub(1);

        // G

        // Initiate withdraw
        _withdraw(gelatoCore.ownerOf(_executionClaimId),
                  gelatoCore.getClaimSellToken(_executionClaimId),
                  gelatoCore.getClaimBuyToken(_executionClaimId),
                  orderState.lastAuctionIndex,
                  orderState.actualLastSubOrderAmount
        );
    }

}


