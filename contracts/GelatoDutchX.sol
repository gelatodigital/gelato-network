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

    struct SellOrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        uint256 remainingSubOrders;  // default: == numSubOrders
        uint256 actualLastSubOrderAmount;  // default: 0
    }


    // Events
    event LogNewSellOrderCreated(bytes32 indexed sellOrderHash,
                                 address indexed dappInterface,  // filtering for contract events possible on default?
                                 address seller,
                                 // so executors can search for lucrative interfaces:
                                 uint256 indexed executorRewardPerSubOrder
    );
    event LogNumDen(uint256 indexed num, uint256 indexed den);
    event LogActualSubOrderAmount(uint256 indexed subOrderAmount,
                                  uint256 indexed actualSubOrderAmount,
                                  uint256 indexed fee
    );
    // event LogSubOrderExecuted(bytes32 indexed subOrderHash,
    //                           address indexed trader,
    //                           uint256 executorRewardPerSubOrder
    // );
    event LogExecutorPayout(bytes32 indexed subOrderHash,
                            address payable indexed executor,
                            uint256 indexed executorRewardPerSubOrder
    );
    event LogExecutorRewardUpdate(uint256 indexed dappInterface,
                                  uint256 indexed executorRewardPerSubOrder
    );

    event LogExecutorRewardPerSubOrderUpdate(address gelatoDutchXInterface, uint256 bounty);



    // **************************** State Variables ******************************

    // Interfaces to other contracts that are set during construction.
    GelatoCore public Core;
    DutchExchange public DutchX;

    // sellOrderHash => SellOrderState struct
    mapping(bytes32 => SellOrderState) public sellOrderStates;

    // Seller => array of sellOrderHash(es)
    mapping(address => bytes32[]) public sellOrdersBySeller;

    // Constants that are set during contract construction and updateable via setters
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
        Core = GelatoCore(_GelatoCoreProxy);  // Upgradeability via Proxy
        DutchX = DutchExchange(_DutchXProxy);  // Upgradeability via Proxy
        auctionStartWaitingForFunding = 1;
        executorRewardPerSubOrder = 10 finney;  // ca. 2.7 USD at 273$ per ETH
    }


    // Fallback function: reverts incoming ether payments not addressed to a payable function
    function() external payable {
        revert("Should not send ether to GelatoDutchX without calling one of its payable public functions");
    }


    // **************************** State Variable Setters ******************************
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
        emit LogExecutorRewardPerSubOrderUpdate(address(this), executorRewardPerSubOrder);
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
        external
        payable
        returns (bytes32)

    {
        // Prevention of zero values is done in Gelato Core protocol

        // @DEV: capping number of sub orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs
        /* Step1: Invariant Requirements
            * Handled by Core protocol:
                * 1: subOrderSizes from one Sell Order are constant.
                    * totalSellVolume == numSubOrders * subOrderSize.
            * Handled by Gelato-DutchX-Interface
                * 2: The caller transfers the correct amount of ether as reward endowment
                    * msg.value == numSubOrders * executorRewardPerSubOrder
        */
        // Invariants2: Executor reward per subOrder and tx endowment checks
        require(msg.value == _numSubOrders.mul(executorRewardPerSubOrder),
            "Failed Invariant2: msg.value == numSubOrders * executorRewardPerSubOrder"
        );


        // Step2: Instantiate new DutchX-specific sell order
        SellOrderState memory sellOrderState = SellOrderState(
            false,  // default: lastAuctionWasWaiting
            0,  // default: lastAuctionIndex
            _numSubOrders,  // default: remainingSubOrders
            0  // default: actualLastSubOrderAmount
        );


        // Step3: hash sell order: yields core protocol's parentOrderHash
        bytes32 sellOrderHash = keccak256(abi.encodePacked(msg.sender,  //seller
                                                           _sellToken,
                                                           _buyToken,
                                                           _totalSellVolume,
                                                           _numSubOrders,
                                                           _subOrderSize,
                                                           _executionTime,
                                                           _intervalSpan)
        );
        // Prevent overwriting stored sub orders because of hash collisions
        // @DEV double check if that makes sense
        if (sellOrderStates[sellOrderHash].lastAuctionIndex != 0) {
            revert("Sell Order already registered. Identical sellOrders disallowed");
        }


        // Step4: Update GelatoDutchX state variables
        sellOrderStates[sellOrderHash] = sellOrderState;
        sellOrdersBySeller[msg.sender].push(sellOrderHash);


        //  ***** GELATO CORE PROTOCOL INTERACTION *****
        // Step5: call Gelato Core protocol's splitSchedule() function transferring
        //  the total executor reward's worth of ether via msg.value
        Core.splitSchedule(sellOrderHash,
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


        // Step6: Emit New Sell Order to link to its suborder constituents on the core protocol
        emit LogNewSellOrderCreated(sellOrderHash,  // Link to core protocol suborders
                                    address(this),  // embeds executors' decision-making
                                    msg.sender,         // filter for sellers
                                    executorRewardPerSubOrder
        );
    }

    // **************************** splitSellOrder() END ******************************



    // **************************** executeSubOrder()  *********************************
    function executeSubOrder(uint256 _tokenId)
        public
        returns (bool)
    {
        // Step1: get subOrder to be executed from Gelato Core
        (
            address gelatoInterface,
            bytes32 parentOrderHash,
            address trader,
            address sellToken,
            address buyToken,
            uint256 childOrderSize,
            uint256 executionTime
        ) = Core.getChildOrder(_tokenId);

        // require interface address to be the same as this addresss
        require(gelatoInterface == address(this));

        bytes32 sellOrderHash = parentOrderHash;

        // Step2: point to sellOrderState in storage. This gets updated later.
        SellOrderState storage sellOrderState = sellOrderStates[sellOrderHash];

        // Local variables for readability
        address payable executor = msg.sender;
        bool lastAuctionWasWaiting = sellOrderState.lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex = sellOrderState.lastAuctionIndex;  // default: 0
        // SubOrderAmount - fee paid to the DutchX of last executed sellOrderState

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
        // Execute if: Seller has the balance.
        require(
            ERC20(sellToken).balanceOf(trader) >= childOrderSize,
            "Failed ERC balance test: Seller balance must be greater than or equal to subOrderSize"
        );
        // Execute if: Gelato has the allowance.
        require(
            ERC20(sellToken)
            .allowance(trader, address(this)) >= childOrderSize,
            "Failed ERC allowance test: Gelato allowance must be greater than or equal to subOrderSize"
        );
        // ********************** Step3: Basic Execution Logic END **********************


        // ********************** Step4: Fetch data from DutchX **********************
        uint256 newAuctionIndex = DutchX.getAuctionIndex(buyToken, sellToken);
        uint256 auctionStartTime = DutchX.getAuctionStart(sellToken, buyToken);
        // ********************** Step4: Fetch data from DutchX END **********************


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
            "Fatal error: Gelato auction index ahead of DutchX auction index"
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
                sellOrderState.lastAuctionIndex = newAuctionIndex;

                // Store change in sellOrderState.lastAuctionWasWaiting state
                sellOrderState.lastAuctionWasWaiting = newAuctionIsWaiting;

                // Decrease remainingSubOrders
                sellOrderState.remainingSubOrders = sellOrderState.remainingSubOrders.sub(1);

                // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(childOrderSize);
                // ### EFFECTS END ###

                // INTERACTION: sell on DutchX
                _depositAndSell(trader,
                                sellToken,
                                buyToken,
                                childOrderSize
                );
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

                // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                // Store the actually sold sub-order amount in the struct
                sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(childOrderSize);
                // ### EFFECTS END ###

                // INTERACTION: sell on DutchX
                _depositAndSell(trader,
                                sellToken,
                                buyToken,
                                childOrderSize
                );
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

            // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
            // Store the actually sold sub-order amount in the struct
            sellOrderState.actualLastSubOrderAmount = _calcActualSubOrderSize(childOrderSize);
            // ### EFFECTS END ###

            // INTERACTION: sell on DutchX
            _depositAndSell(trader,
                            sellToken,
                            buyToken,
                            childOrderSize
            );
        }
        // Case 5: Unforeseen stuff
        else {
            revert("Case5: Fatal Error: Case5 unforeseen");
        }

        // Event emissions
        // emit LogSubOrderExecuted(_tokenId, trader, executorRewardPerSubOrder);

        // ********************** Step5: Advanced Execution Logic END **********************


        // ********************** Step6: ExecutorReward Transfer ********************
        executor.transfer(executorRewardPerSubOrder);
        // emit LogExecutorPayout(_tokenId, executor, executorRewardPerSubOrder);
        // ********************** Step6: ExecutorReward Transfer END ****************


        // Step7: return success
        return true;
    }
    // **************************** executeSubOrder() END *********************************


    // Helper Functions
    // Calculate sub order size accounting for current DutchX liquidity contribution fee.
    function _calcActualSubOrderSize(uint256 _sellAmount)
        public
        returns(uint256)
    {
        // Get current fee ratio of Gelato contract
        uint256 num;
        uint256 den;

        // Returns e.g. num = 1, den = 500 for 0.2% fee
        (num, den) = DutchX.getFeeRatio(address(this));

        // Calc fee amount
        uint256 fee = _sellAmount.mul(num).div(den);

        emit LogNumDen(num, den);

        // Calc actual Sell Amount
        uint256 actualSellAmount = _sellAmount.sub(fee);

        emit LogActualSubOrderAmount(_sellAmount, actualSellAmount, fee);
    }

    // Deposit and sell on the DutchX
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

        // @DEV: before selling, approve the DutchX to extract the ERC20 Token from this contract
        ERC20(_sellToken).approve(address(DutchX), _subOrderSize);

        // @DEV deposit and sell on the DutchX
        DutchX.depositAndSell(_sellToken, _buyToken, _subOrderSize);

        return true;
    }


    // Deprecated Withdrawal functions
    /*function withdrawManually(bytes32 _sellOrderHash)
        public
    {
        SellOrderState storage sellOrderState = sellOrders[_sellOrderHash];

        // Check if msg.sender is equal seller
        // @Kalbo: Do we really need that or should we make everyone be able to withdraw on behalf of a user?
        require(msg.sender == trader, 'Only the seller of the sellOrderState can call this function');

        // Check if tx executor hasnt already withdrawn the funds
        require(sellOrderState.remainingSubOrders.add(1) == sellOrderState.remainingWithdrawals, 'Your funds from the last cleared auction you participated in were already withdrawn to your account');

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;

        // Ex: num = 1, den = 250
        (num, den) = DutchX.closingPrices(sellToken, buyToken, sellOrderState.lastAuctionIndex);
        // Check if the last auction the seller participated in has cleared

        // @DEV Check line 442 in DutchX contract
        require(den != 0, 'Last auction did not clear thus far, you have to wait');

        // Mark withdraw as completed
        sellOrderState.remainingWithdrawals = sellOrderState.remainingWithdrawals.sub(1);

        // Initiate withdraw
        _withdraw(trader, sellToken, buyToken, sellOrderState.lastAuctionIndex, sellOrderState.actualLastSubOrderAmount);
    }*/


    /* Internal func that withdraws funds from DutchX to the sellers account
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

    }*/
    // @DEV Calculates amount withdrawable from past, cleared auction

    /* function _calcWithdrawAmount(address _sellToken, address _buyToken, uint256 _lastAuctionIndex, uint256 _actualLastSubOrderAmount)
        public
        returns(uint256)
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
    }*/


    /* Deprecated cancel order function
    function cancelSellOrder(bytes32 sellOrderHash)
            public
            returns(bool)
        {
            SellOrderState storage sellOrderState = sellOrderStates[sellOrderHash];

            require(!sellOrderState.cancelled,
                "Sell order was cancelled already"
            );
            require(msg.sender == trader,
                "Only seller can cancel the sell order"
            );

            sellOrderState.cancelled = true;

            emit LogSellOrderCancelled(sellOrderHash, trader);

            return true;
      }
    */

}


