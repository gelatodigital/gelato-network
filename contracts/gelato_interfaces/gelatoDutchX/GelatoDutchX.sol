pragma solidity >=0.4.21 <0.6.0;

//  Imports:
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
import '../../base/Counters.sol';
import '../../base/ERC20.sol';
import '../../base/IcedOut.sol';

// Gelato IcedOut-compliant DutchX Interface for splitting sell orders and for automated withdrawals
contract GelatoDutchX is IcedOut, SafeTransfer {
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
                              uint256 indexed orderId,
                              address indexed seller,
                              address buyToken,
                              uint256 withdrawAmount
    );
    event LogOrderCompletedAndDeleted(uint256 indexed orderId);
    event LogWithdrawAmount(uint256 num, uint256 den, uint256 withdrawAmount);
    event LogGas(uint256 gas1, uint256 gas2);
    // **************************** Events END ******************************

    // base contract => Ownable => indirect use through IcedOut
    // Libraries
    // using SafeMath for uint256; => indirect use through IcedOut
    using Counters for Counters.Counter;

    Counters.Counter private orderIds;

    // One OrderState to many SellOrder
    struct OrderState {
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
    }

    // One SellOrder to one parent OrderState
    struct SellOrder {
        bool posted;
        uint256 executionTime; // Condition for execution
        uint256 orderStateId; // Link to parent OrderState
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
    mapping(uint256 => OrderState) public orderStates;

    // gelatoCore executionId => individual sellOrder struct
    // Note 2 executionIds will map to the same sellOrder struct (execDepositAndSell and withdraw)
    // mapping(uint256 => SellOrder) public sellOrders;

    // // Map execWithdraw claim to respective execDepositAndSellClaim
    // mapping(uint256 => uint256) public sellOrderLink;

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
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _totalSellVolume, true),
            "GelatoDutchX.timedSellOrders: The transfer of sellTokens from msg.sender to Gelato Interface must succeed"
        );

        // Step5: Instantiate new dutchExchange-specific sell order state
        OrderState memory orderState = OrderState(
            false,  // default: lastAuctionWasWaiting
            0  // default: lastAuctionIndex
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
                _executionTime.add(_intervalSpan.mul(i)),
                orderStateId,
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

        // Step2: Create storage pointer for the individual sellOrder and the parent orderState
        // Fetch SellOrder
        SellOrder storage sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];

        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState storage orderState = orderStates[orderStateId];

        // Step3: Check the condition: Execution Time
        // @DEV: high potential for bad interfaces if not done right
        checkTimeCondition(sellOrder.executionTime);

        // Step4: initialise multi-use variables
        // ********************** Load variables from storage and initialise them **********************
        address sellToken = sellOrder.sellToken;
        address buyToken = sellOrder.buyToken;
        uint256 sellAmount = sellOrder.sellAmount;
        // the last DutchX auctionIndex at which the orderState participated in
        uint256 lastAuctionIndex = orderState.lastAuctionIndex;  // default: 0
        // ********************** Load variables from storage and initialise them END **********************

        // Step5: Fetch auction specific data from Dutch Exchange
        // ********************** Fetch data from dutchExchange **********************
        uint256 currentAuctionIndex = dutchExchange.getAuctionIndex(sellToken, buyToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Fetch data from dutchExchange END **********************

        // Step6: Check if interface has enough funds to sell on the Dutch Exchange
        require(
            ERC20(sellToken).balanceOf(address(this)) >= sellAmount,
            "GelatoDutchX.execDepositAndSell: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );

        // Step7: Set the auction specific orderState variables
        // Waiting Period variables needed to prevent double participation in DutchX auctions
        bool lastAuctionWasWaiting = orderState.lastAuctionWasWaiting;  // default: false
        bool newAuctionIsWaiting;
        // The index of the auction that the sellAmount will actually flow to
        uint256 participationAuctionIndex;
        // Check if we are in a Waiting period or auction running period
        if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
            newAuctionIsWaiting = true;
            // We are in waiting period and the sellAmount will go into sellVolumesCurrent
            participationAuctionIndex = currentAuctionIndex;
        } else if (auctionStartTime < now) {
            newAuctionIsWaiting = false;
            // Auction is currently ongoing and sellAmount will go into sellVolumesNext
            participationAuctionIndex = currentAuctionIndex.add(1);
        }

        // Step7: Check auciton Index and call depositAndSell
        /* Assumptions:
            * 1: Don't sell in the same auction twice
        */
        // CASE 1:
        // Check case where lastAuctionIndex is greater than currentAuctionIndex
        require(currentAuctionIndex >= lastAuctionIndex,
            "GelatoDutchX.execDepositAndSell Case 1: Fatal error, Gelato auction index ahead of dutchExchange auction index"
        );

        // CASE 2:
        // Either we already posted during waitingPeriod OR during the auction that followed
        if (currentAuctionIndex == lastAuctionIndex) {
            // Case2a: Last posted during waitingPeriod1, new CANNOT sell during waitingPeriod1.
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("GelatoDutchX.execDepositAndSellCase2a: Last posted during waitingPeriod1, new CANNOT sell during waitingPeriod1");
            }
            /* Case2b: We posted during waitingPeriod1, our funds went into auction1,
            now auction1 is running, now we sell again during auction1, as this time our funds would go into auction2. */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = participationAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.sellAmount so when an executor calls execWithdraw, the seller receives withdraws the correct sellAmount given sellAmountMinusFee
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
            /* Case2c Last posted during running auction1, new tries to sell during waiting period
            that preceded auction1 (impossible time-travel) or new tries to sell during waiting
            period succeeding auction1 (impossible due to auction index incrementation ->
            currentAuctionIndex == lastAuctionIndex cannot be true - Gelato-dutchExchange indexing
            must be out of sync) */
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("GelatoDutchX.execDepositAndSellCase2b: Fatal error: auction index incrementation out of sync");
            }
            // Case2d: Last posted during running auction1, new CANNOT sell during auction1.
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                revert("GelatoDutchX.execDepositAndSellCase2c: Selling twice into the same running auction is disallowed");
            }
        }
        // CASE 3:
        // We participated at previous auction index
        // Either we posted during previous waiting period, or during previous auction.
        else if (currentAuctionIndex == lastAuctionIndex.add(1)) {
            /* Case3a: We posted during previous waiting period, our funds went into auction1,
            then auction1 ran, then auction1 cleared and the auctionIndex got incremented,
            we now sell during the next waiting period, our funds will go to auction2 */
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = participationAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.sellAmount so when an executor calls execWithdraw, the seller receives withdraws the correct sellAmount given sellAmountMinusFee
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
            /* Case3b: We posted during previous waiting period, our funds went into auction1, then
            auction1 ran, then auction1 cleared and the auction index was incremented,
            , then a waiting period passed, now we are selling during auction2, our funds
            will go into auction3 */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = participationAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.sellAmount so when an executor calls execWithdraw, the seller receives withdraws the correct sellAmount given sellAmountMinusFee
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
            /* Case3c: We posted during auction1, our funds went into auction2, then auction1 cleared
            and the auction index was incremented, now we are NOT selling during the ensuing
            waiting period because our funds would also go into auction2 */
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("GelatoDutchX.execDepositAndSell.Case3c: Failed: Selling twice during auction and ensuing waiting period disallowed");
            }
            /* Case3d: We posted during auction1, our funds went into auction2, then auction1
            cleared and the auctionIndex got incremented, then a waiting period passed, now
            we DO NOT sell during the running auction2, even though our funds will go to
            auction3 because we only sell after the last auction that we contributed to
            , in this case auction2, has been cleared and its index incremented */
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // Given new assumption of not wanting to sell in newAuction before lastAuction posted-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
                revert("GelatoDutchX.execDepositAndSellCase 3d: Don't sell before last auction seller participated in has cleared");
            }
        }
        // CASE 4:
        // If we skipped at least one auction before trying to sell again: ALWAYS SELL
        else if (currentAuctionIndex >= lastAuctionIndex.add(2)) {
            // ### EFFECTS ###
            // Update Order State
            orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
            orderState.lastAuctionIndex = participationAuctionIndex;
            uint256 dutchXFee;
            // Update sellOrder.sellAmount so when an executor calls execWithdraw, the seller receives withdraws the correct sellAmount given sellAmountMinusFee
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
        // Case 5: Unforeseen stuff
        else {
            revert("GelatoDutchX.execDepositAndSell Case5: Fatal Error: Case5 unforeseen");
        }
        // ********************** Step7: Execution Logic END **********************

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
        require(sellOrder.posted, "GelatoDutchX.execWithdraw: Sell Order must have been posted in order to withdraw");

        // DEV use memory value lastAuctionIndex & sellAmountAfterFee as we already updated storage values
        uint256 sellAmount = sellOrder.sellAmount;

        // delete sellOrder
        delete sellOrders[_executionClaimId][_executionClaimId - 1];

        // Calculate withdraw sellAmount
        uint256 withdrawAmount = _withdraw(seller,
                                           sellOrder.sellToken,
                                           sellOrder.buyToken,
                                           orderState.lastAuctionIndex,
                                           sellAmount //Actual sellAmount posted
        );

        // Event emission
        emit LogWithdrawComplete(_executionClaimId,
                                 orderStateId,
                                 seller,
                                 sellOrder.buyToken,
                                 withdrawAmount
        );

        // Delete OrderState struct when last withdrawal completed
        // if (orderState.remainingWithdrawals == 0) {
        //     delete orderStates[orderId];
        //     emit LogOrderCompletedAndDeleted(orderId);
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
        require(sellOrder.sellAmount != 0,
            "GelatoDutchX.cancelOrder: Only executionClaims that have a postive sellAmount can be cancelled"
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
        // transfer sellAmount back from this contracts ERC20 balance to seller
        // REFUND USER!!!
        // In order to refund the exact sellAmount the user prepaid, we need to store that information on-chain
        msg.sender.transfer(sellOrder.prepaymentPerSellOrder);

        // Transfer ERC20 Tokens back to seller
        safeTransfer(sellOrder.sellToken, msg.sender, sellOrder.sellAmount, false);

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

        // DEV use memory value lastAuctionIndex & sellAmountAfterFee as we already updated storage values
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

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(sellOrder.sellToken,
                                                 sellOrder.buyToken,
                                                 orderState.lastAuctionIndex
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
                  orderState.lastAuctionIndex,
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
                       uint256 _lastAuctionIndex,
                       uint256 _sellAmountAfterFee
    )
        private
        returns(uint256 withdrawAmount)
    {
        // Calc how much the sellAmount of buy_tokens received in the previously participated auction
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

        // Transfer Tokens from GelatoDutchX to Seller
        safeTransfer(_buyToken, _seller, withdrawAmount, false);
    }

    // DEV Calculates sellAmount withdrawable from past, cleared auction
    function _calcWithdrawAmount(address _sellToken,
                                 address _buyToken,
                                 uint256 _lastAuctionIndex,
                                 uint256 _sellAmountAfterFee
    )
        public
        returns(uint256 withdrawAmount)
    {
        // Fetch numerator and denominator from dutchExchange
        uint256 num;
        uint256 den;

        // FETCH PRICE OF CLEARED ORDER WITH INDEX lastAuctionIndex
        // num: buyVolumeOpp || den: sellVolumeOpp
        // Ex: num = 1000, den = 10 => 1WETH === 100RDN
        (num, den) = dutchExchange.closingPrices(_sellToken,
                                                 _buyToken,
                                                 _lastAuctionIndex
        );

        // Check if the last auction the seller participated in has cleared
        // DEV Check line 442 in dutchExchange contract
        // DEV Test: Are there any other possibilities for den being 0 other than when the auction has not yet cleared?
        require(den != 0,
            "GelatoDutchX._calcWithdrawAmount: den != 0, Last auction did not clear thus far, you have to wait"
        );

        emit LogWithdrawAmount(num, den, _sellAmountAfterFee.mul(num).div(den));

        // Callculate withdraw sellAmount
        withdrawAmount = _sellAmountAfterFee.mul(num).div(den);
    }
    // **************************** Helper functions END *********************************

}


