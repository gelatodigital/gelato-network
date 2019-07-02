pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import './GelatoCore.sol';
import './base/ERC20.sol';
import './base/SafeMath.sol';
import './base/Ownable.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';

contract GelatoDutchX is Ownable() {

    // Libraries used:
    using SafeMath for uint256;

    struct SellOrder {
        bool lastAuctionWasWaiting;
        uint256 remainingSubOrders;
        uint256 lastAuctionIndex;  // default: 0
        uint256 actualLastSubOrderAmount;
    }


    // Events
    event LogNewSellOrderCreated(bytes32 indexed sellOrderHash,
                                 address indexed dappInterface,  // filtering for contract events possible on default?
                                 address indexed seller,
                                 uint256 executorRewardPerSubOrder
    );
    event LogNumDen(uint indexed num, uint indexed den);

    event LogActualSubOrderAmount(uint256 indexed subOrderAmount,
                                  uint256 indexed actualSubOrderAmount,
                                  uint256 indexed fee
    );


    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    GelatoCore public GelatoCore;
    DutchExchange public DutchX;

    // Find unique sellOrder with sellOrderHash
    mapping(bytes32 => SellOrder) public sellOrders;

    // Find all sellOrders of one single seller
    mapping(address => bytes32[]) public sellOrdersBySeller;

    // Constants that are set during contract construction
    uint256 public auctionStartWaitingForFunding;
    uint256 public executorRewardPerSubOrder;

    // **************************** State Variables END ******************************


    /* constructor():
        * constructs Ownable base and sets msg.sender as owner.
        * connects the contract interfaces to deployed instances thereof.
        * sets the state variable constants
    */
    constructor(address _GelatoCoreProxy, address _DutchXProxy)
        public
    {
        GelatoCore = GelatoCore(_GelatoCoreProxy);  // Upgradeability via Proxy
        DutchX = DutchExchange(_DutchXProxy);  // Upgradeability via Proxy
        auctionStartWaitingForFunding = 1;
        executorRewardPerSubOrder = 10 finney;  // ca. 2.7 USD at 273$ per ETH
    }


    // **************************** Updateability ******************************
    function setAuctionStartWaitingForFunding(uint256 _auctionStartWaitingForFunding)
        onlyOwner
        external
    {
        auctionStartWaitingForFunding = _auctionStartWaitingForFunding;
    }

    function setExecutorRewardPerSubOrder(uint256 _executorRewardPerSubOrder)
        onlyOwner
        external
    {
        executorRewardPerSubOrder = _executorRewardPerSubOrder;
    }
    // **************************** Updateability END ******************************


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
        returns (bytes32 sellOrderHash)

    {
        // Prevention of zero values is done in Gelato Core protocol

        /* Step1: Invariant Requirements
            * Handled by Core protocol:
                * 1: subOrderSizes from one Sell Order are constant.
                    * totalSellVolume == numSubOrders * subOrderSize.
                * 2: executorRewardPerSubOrder from one Sell Order is constant.
                    * msg.value == numSubOrders * executorRewardPerSubOrder
            * Handled by Gelato-DutchX-Interface
                * 3: executorRewardPerSubOrder meets threshold
                    * executorRewardPerSubOrder == executorRewardPerSubOrder
        */
        require(msg.value == executorRewardPerSubOrder,
            "Failed Invariant3: msg.value == executorRewardPerSubOrder"
        );

        // Step2: Instantiate new DutchX-specific sell order
        SellOrder memory sellOrder = SellOrder(
            false,  // default: lastAuctionWasWaiting
            _numSubOrders,  // default: remainingSubOrders
            0,  // default: lastAuctionIndex
            0  // default: actualLastSubOrderAmount
        );

        // Step3: hash sell order to yield core protocol's parentOrderHash
        bytes32 sellOrderHash = keccak256(abi.encodePacked(seller,
                                                           _sellToken,
                                                           _buyToken,
                                                           _totalSellVolume,
                                                           _numSubOrders,
                                                           _subOrderSize,
                                                           _executionTime,
                                                           _intervalSpan)
        );

        // Prevent overwriting stored sub orders because of hash collisions
        if (sellOrders[sellOrderHash].seller != address(0)) {
            revert("Sell Order already registered. Identical sellOrders disallowed");
        }

        // Step4: Write to GelatoDutchX storage
        // Store new sell order in sellOrders mapping
        sellOrders[sellOrderHash] = sellOrder;

        // Store new sellOrders in sellOrdersBySeller array by their hash
        sellOrdersBySeller[seller].push(sellOrderHash);

        // Step5: call Gelato Core protocol's splitSchedule() function
        //  ***** GELATO CORE PROTOCOL INTERACTION *****
        GelatoCore.splitSchedule(sellOrderHash,
                                 msg.sender,  // seller
                                 _sellToken,
                                 _buyToken,
                                 _totalSellVolume,
                                 _numSubOrders,
                                 _subOrderSize,
                                 _executionTime,
                                 _intervalSpan
        );

        //  *** GELATO CORE PROTOCOL INTERACTION END ***

        // Emit New Sell Order to link to its suborder constituents on the core protocol
        emit LogNewSellOrderCreated(sellOrderHash,  // Link to core protocol suborders
                                    address(this),  // embeds executors' decision-making
                                    seller,         // filter for interface users
                                    _executorRewardPerSubOrder
        );

    }

    // **************************** splitSellOrder() END ******************************

    // **************************** executeSubOrderAndWithdraw()  *********************************


    function executeSubOrderAndWithdraw(bytes32 sellOrderHash)
        public
        returns (bool success)
    {
        SellOrder storage subOrder = sellOrders[sellOrderHash];

        // Local variables

        // Tx executor
        address payable executor = msg.sender;

        // default: false
        bool lastAuctionWasWaiting = subOrder.lastAuctionWasWaiting;

        // Default to 0 for first execution;
        uint256 lastAuctionIndex = subOrder.lastAuctionIndex;

        // Fetches current auction index from DutchX
        uint256 newAuctionIndex = DutchX.getAuctionIndex(subOrder.buyToken, subOrder.sellToken);

        // SubOrderAmount - fee paid to the DutchX of last executed subOrder
        uint256 actualLastSubOrderAmount = subOrder.actualLastSubOrderAmount;

        // How many executions are left
        uint256 remainingSubOrders = subOrder.remainingSubOrders;

        /* Basic Execution Logic
            * Require that subOrder is ready to be executed based on time
            * Require that seller has ERC20 balance
            * Require that Gelato has matching seller's ERC20 allowance
        */

        // Execute if: It's executionTime !
        require(subOrder.executionTime <= now,
            "Failed: You called before scheduled execution time"
        );

        // Execute only if at least one remaining Withdrawal exists, after that do not execute anymore
        // @Luis, this acts as the "complete" bool
        require(subOrder.remainingWithdrawals >= 1, 'Failed: Sell Order already completed. All subOrders executed and withdrawn');

        // Check whether there are still remaining subOrders left to be executed
        if (subOrder.remainingSubOrders >= 1) {

            // Execute if: Seller has the balance.
            // @DEV Revisit based on payout logic
            require(
                // @DEV revisit adding execution reward based on payout logic
                ERC20(subOrder.sellToken).balanceOf(subOrder.seller) >= subOrder.subOrderSize,
                "Failed ERC balance test: Seller balance must be greater than or equal to totalSellVolume"
            );

            // Execute if: Gelato has the allowance.
            require(
                ERC20(subOrder.sellToken)
                .allowance(subOrder.seller, address(this)) >= subOrder.subOrderSize,
                "Failed ERC allowance test: Gelato allowance must be greater than or equal to totalSellVolume"
            );

            // ********************** Basic Execution Logic END **********************


            // ********************** Advanced Execution Logic **********************

            // Define if the new auction is in the Waiting period or not, defaulting to false
            bool newAuctionIsWaiting;

            // Fetch DutchX auction start time
            uint auctionStartTime = DutchX.getAuctionStart(subOrder.sellToken, subOrder.buyToken);

            // Check if we are in a Waiting period or auction running period
            // @Dev, we need to account for latency here
            if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
                newAuctionIsWaiting = true;
            } else if (auctionStartTime < now) {
                newAuctionIsWaiting = false;
            }

            // Assumpions:
            // #1 Don't sell in the same auction twice
            // #2 Don't sell into an auction before the prior auction you sold into has cleared so we can withdraw safely

            // CASE 1:
            // Check case where lastAuctionIndex is greater than newAuctionIndex
            require(newAuctionIndex >= lastAuctionIndex, "Fatal error: Gelato auction index ahead of DutchX auction index");

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
                newAuctionIndex == lastAuctionIndex cannot be true - Gelato-DutchX indexing
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
                    subOrder.lastAuctionIndex = newAuctionIndex;

                    // Store change in subOrder.lastAuctionWasWaiting state
                    subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;

                    // Decrease remainingSubOrders
                    subOrder.remainingSubOrders = subOrder.remainingSubOrders.sub(1);

                    // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                    // Store the actually sold sub-order amount in the struct
                    subOrder.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrder.subOrderSize);

                    // Update executionTime with freeze Time
                    subOrder.executionTime = subOrder.executionTime.add(subOrder.intervalSpan);

                    // ### EFFECTS END ###

                    emit LogNewHammerTime(sellOrderHash,
                                        subOrder.seller,
                                        subOrder.executionTime,
                                        subOrder.executorRewardPerSubOrder
                    );

                    // Sell
                    _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize, subOrder.seller, sellOrderHash, subOrder.executorRewardPerSubOrder);
                }
                /* Case3b: We sold during previous waiting period, our funds went into auction1, then
                auction1 ran, then auction1 cleared and the auction index was incremented,
                , then a waiting period passed, now we are selling during auction2, our funds
                will go into auction3 */
                else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                    // ### EFFECTS ###

                    // Store change in Auction Index
                    subOrder.lastAuctionIndex = newAuctionIndex;

                    // Store change in subOrder.lastAuctionWasWaiting state
                    subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;

                    // Decrease remainingSubOrders
                    subOrder.remainingSubOrders = subOrder.remainingSubOrders.sub(1);

                    // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                    // Store the actually sold sub-order amount in the struct
                    subOrder.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrder.subOrderSize);

                    // Update executionTime with freeze Time
                    subOrder.executionTime = subOrder.executionTime.add(subOrder.intervalSpan);

                    // ### EFFECTS END ###

                    emit LogNewHammerTime(sellOrderHash,
                                        subOrder.seller,
                                        subOrder.executionTime,
                                        subOrder.executorRewardPerSubOrder
                    );

                    // Sell
                    _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize, subOrder.seller, sellOrderHash, subOrder.executorRewardPerSubOrder);
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
                subOrder.lastAuctionIndex = newAuctionIndex;

                // Store change in subOrder.lastAuctionWasWaiting state
                subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;

                // Decrease remainingSubOrders
                subOrder.remainingSubOrders = subOrder.remainingSubOrders.sub(1);

                // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                subOrder.actualLastSubOrderAmount = _calcActualSubOrderSize(subOrder.subOrderSize);

                // Update executionTime with freeze Time
                subOrder.executionTime = subOrder.executionTime.add(subOrder.intervalSpan);

                // ### EFFECTS END ###

                emit LogNewHammerTime(sellOrderHash,
                                    subOrder.seller,
                                    subOrder.executionTime,
                                    subOrder.executorRewardPerSubOrder
                );

                // Sell
                _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize, subOrder.seller, sellOrderHash, subOrder.executorRewardPerSubOrder);

            }
            // Case 5: Unforeseen stuff
            else {
                revert("Case5: Fatal Error: Case5 unforeseen");
            }
            // ********************** Advanced Execution Logic END **********************

        }
        // If all subOrder have been executed, mark sell Order as complete
        else if ( remainingSubOrders == 0 )
        {
            subOrder.complete = true;

            emit LogSellOrderComplete(sellOrderHash,
                                      subOrder.seller,
                                      executor
            );
        }

        // ********************** Withdraw from DutchX **********************

        // Only enter after first sub-order sale
        // Only enter if last auction the seller participated in has cleared
        // Only enter if seller has not called withdrawManually
        if (lastAuctionIndex != 0 && subOrder.remainingWithdrawals == remainingSubOrders.add(1) )
        {

            // Mark withdraw as completed
            subOrder.remainingWithdrawals = subOrder.remainingWithdrawals.sub(1);

            // @DEV use memory value lastAuctionIndex & actualLastSubOrderAmount as we already incremented storage values
            _withdraw(subOrder.seller, subOrder.sellToken, subOrder.buyToken, lastAuctionIndex, actualLastSubOrderAmount);
        }

        // ********************** Withdraw from DutchX END **********************

        // ********************** ExecutorReward Transfer ********************

        executor.transfer(subOrder.executorRewardPerSubOrder);

        // ********************** ExecutorReward Transfer END ****************

        return true;
    }

    function withdrawManually(bytes32 _sellOrderHash)
    public
    {
        SellOrder storage subOrder = sellOrders[_sellOrderHash];

        // Check if msg.sender is equal seller
        // @Kalbo: Do we really need that or should we make everyone be able to withdraw on behalf of a user?
        require(msg.sender == subOrder.seller, 'Only the seller of the sellOrder can call this function');

        // Check if tx executor hasnt already withdrawn the funds
        require(subOrder.remainingSubOrders.add(1) == subOrder.remainingWithdrawals, 'Your funds from the last cleared auction you participated in were already withdrawn to your account');

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint num;
        uint den;

        // Ex: num = 1, den = 250
        (num, den) = DutchX.closingPrices(subOrder.sellToken, subOrder.buyToken, subOrder.lastAuctionIndex);
        // Check if the last auction the seller participated in has cleared

        // @DEV Check line 442 in DutchX contract
        require(den != 0, 'Last auction did not clear thus far, you have to wait');

        // Mark withdraw as completed
        subOrder.remainingWithdrawals = subOrder.remainingWithdrawals.sub(1);

        // Initiate withdraw
        _withdraw(subOrder.seller, subOrder.sellToken, subOrder.buyToken, subOrder.lastAuctionIndex, subOrder.actualLastSubOrderAmount);
    }


    // Internal func that withdraws funds from DutchX to the sellers account
    function _withdraw(address _seller, address _sellToken, address _buyToken, uint256 _lastAuctionIndex, uint256 _actualLastSubOrderAmount)
        public
    {
        // Calc how much the amount of buy_tokens received in the previously participated auction
        uint256 withdrawAmount = _calcWithdrawAmount(_sellToken, _buyToken, _lastAuctionIndex, _actualLastSubOrderAmount);

        // Withdraw funds from DutchX to Gelato
        // @DEV uses memory value lastAuctionIndex in case execute func calls it as we already incremented storage value
        DutchX.claimAndWithdraw(_sellToken, _buyToken, address(this), _lastAuctionIndex, withdrawAmount);

        // Transfer Tokens from Gelato to Seller
        // ERC20.transfer(address recipient, uint256 amount)
        ERC20(_buyToken).transfer(_seller, withdrawAmount);

        emit LogWithdrawComplete(_seller, withdrawAmount, _buyToken);

    }

    // Deposit and sell on the DutchX
    function _depositAndSell(address _sellToken,
                            address _buyToken,
                            uint256 _subOrderSize,
                            address _seller,
                            bytes32 _sellOrderHash,
                            uint256 _executorRewardPerSubOrder
    )
        private
        returns(bool)
    {
        // @DEV: before selling, transfer the ERC20 tokens from the user to the gelato contract
        ERC20(_sellToken).transferFrom(_seller, address(this), _subOrderSize);

        // @DEV: before selling, approve the DutchX to extract the ERC20 Token from this contract
        ERC20(_sellToken).approve(address(DutchX), _subOrderSize);

        // @DEV deposit and sell on the DutchX
        DutchX.depositAndSell(_sellToken, _buyToken, _subOrderSize);

        emit LogSubOrderExecuted(_sellOrderHash, _seller, msg.sender, _executorRewardPerSubOrder);

        return true;
    }

    function _calcActualSubOrderSize(uint _sellAmount)
        public
        returns(uint)
    {
        // Get current fee ratio of Gelato contract
        uint num;
        uint den;

        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = DutchX.getFeeRatio(address(this));

        // Calc fee amount
        uint fee = _sellAmount.mul(num).div(den);

        emit LogNumDen(num, den);

        // Calc actual Sell Amount
        uint actualSellAmount = _sellAmount.sub(fee);

        emit LogActualSubOrderAmount(_sellAmount, actualSellAmount, fee);

        return actualSellAmount;

    }

    // @DEV Calculates amount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken, address _buyToken, uint256 _lastAuctionIndex, uint _actualLastSubOrderAmount)
        public
        returns(uint)
    {
        // Fetch numerator and denominator from DutchX
        uint256 num;
        uint256 den;

        // FETCH PRICE OF CLEARED ORDER WITH INDEX lastAuctionIndex
        // Ex: num = 1, den = 250
        (num, den) = DutchX.closingPrices(_sellToken, _buyToken, _lastAuctionIndex);

        // Check if the last auction the seller participated in has cleared
        // @DEV Check line 442 in DutchX contract
        // @DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0, 'Last auction did not clear thus far, withdrawal cancelled');

        emit LogNumDen(num, den);

        uint256 withdrawAmount = _actualLastSubOrderAmount.mul(num).div(den);

        emit LogWithdrawAmount(withdrawAmount);

        return withdrawAmount;
    }

    // Fallback function: reverts incoming ether payments not addressed to createSellOrder()
    function() external payable {
        revert("Should not send ether to Gelato contract without calling createSellOrder()");
    }

    // function cancelSellOrder(bytes32 sellOrderHash)
    //     public
    //     returns(bool)
    // {
    //     SellOrder storage sellOrder = sellOrders[sellOrderHash];

    //     require(!sellOrder.cancelled,
    //         "Sell order was cancelled already"
    //     );
    //     require(msg.sender == sellOrder.seller,
    //         "Only seller can cancel the sell order"
    //     );

    //     sellOrder.cancelled = true;

    //     emit LogSellOrderCancelled(sellOrderHash, sellOrder.seller);

    //     return true;
    // }

}


