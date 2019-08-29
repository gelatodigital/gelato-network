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
contract GelatoDutchX is IcedOut, SafeTransfer {
    // parent => Ownable => indirect use through IcedOut
    // Libraries
    // using SafeMath for uint256; => indirect use through IcedOut
    using Counters for Counters.Counter;

    Counters.Counter private orderIds;

    // One OrderState has many SellOrder
    struct OrderState {
        address sellToken; // token to sell
        address buyToken; // token to buy
        bool lastAuctionWasWaiting;  // default: false
        uint256 lastAuctionIndex;  // default: 0
        uint256 prepaymentPerSellOrder; // maxGas * gelatoGasPrice
    }

    // One SellOrder has one parent OrderState
    struct SellOrder {
        uint256 orderStateId; // Link to parent OrderState
        uint256 executionTime; // Condition for execution
        uint256 amount; // amount to be posted
        bool posted; // default: false => After execDepositAndSell => true
    }

    // Legacy Core Struct
    /*
    struct ExecutionClaim {
        address dappInterface;
        uint256 interfaceOrderId;
        address sellToken;
        address buyToken;
        uint256 sellAmount;  // you always sell something, in order to buy something
        uint256 executionTime;
        uint256 prepaidExecutionFee;
    }
    */

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

    // // Max Gas for one execute + withdraw pair => fixed. To adjust prePayment, use gasPrice
    // uint256 public maxGas = 500000;

    // Gas price charged to users
    // uint256 public interfaceGasPrice;


    // **************************** State Variables END ******************************

    /* constructor():
        * constructs Ownable base and sets msg.sender as owner.
        * connects the contract interfaces to deployed instances thereof.
        * sets the state variable constants
    */
    constructor(address payable _GelatoCore, address _DutchExchange)
        // Initialize gelatoCore address & maxGas in IcedOut parent
        IcedOut(_GelatoCore, 500000) // maxGas 277317 for depsositAndSell
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

    // **************************** timeSellOrders() ******************************
    function timeSellOrders(address _sellToken,
                            address _buyToken,
                            uint256 _totalSellVolume,
                            uint256 _numSellOrders,
                            uint256 _sellOrderAmount,
                            uint256 _executionTime,
                            uint256 _intervalSpan
    )
        public
        payable
        returns (bool)

    {
        // Step1: Zero value preventions
        require(_sellToken != address(0), "GelatoCore.mintExecutionClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintExecutionClaim: _buyToken: No zero addresses allowed");
        require(_sellOrderAmount != 0, "GelatoCore.mintExecutionClaim: _sellOrderAmount cannot be 0");
        require(_totalSellVolume != 0, "splitSellOrder: totalSellVolume cannot be 0");
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
        // Total Sell Volume must equal individual sellOrderAmount * number of sellOrders
        require(_totalSellVolume == _numSellOrders.mul(_sellOrderAmount),
            "splitSellOrder: _totalSellVolume != _numSellOrders * _sellOrderAmount"
        );

        // Step4: Transfer the totalSellVolume from msg.sender(seller) to this contract
        // this is hardcoded into SafeTransfer.sol
        require(safeTransfer(_sellToken, address(this), _totalSellVolume, true),
            "splitSellOrder: The transfer of sellTokens from msg.sender to Gelato Interface must succeed"
        );

        // Step5: Instantiate new dutchExchange-specific sell order state
        OrderState memory orderState = OrderState(
            _sellToken,
            _buyToken,
            false,  // default: lastAuctionWasWaiting
            0,  // default: lastAuctionIndex
            prepaymentPerSellOrder
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
                orderStateId,
                _executionTime.add(_intervalSpan.mul(i)),
                _sellOrderAmount,
                false // not withdrawn yet
            );

            // For each sellOrder, mint one claim that call the execDepositAndSell function
            (uint256 executionClaimId, ) = mintClaim("execDepositAndSell(uint256)", msg.sender);

            // For each sellOrder, mint one claim that call the execWithdraw function
            (uint256 executionClaimIdPlusOne, ) = mintClaim("execWithdraw(uint256)", msg.sender);

            // Map first claims to the Sell Order and second claims to the first claim => BONDED Claims
            // @🐮Convert into Mapping of mapping
            // sellOrders[executionClaimId] = sellOrder;
            // sellOrderLink[executionClaimIdPlusOne] = executionClaimId;
            // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
            sellOrders[executionClaimIdPlusOne][executionClaimId] = sellOrder;

            // withdraw execution claim => depositAndSell exeuctionClaim => sellOrder
            //  *** GELATO CORE PROTOCOL INTERACTION END ***
        }


        // Step8: Emit New Sell Order to find its suborder constituent claims on the Core
        emit LogNewOrderCreated(orderStateId, msg.sender);
        return true;
    }
    // **************************** timeSellOrders() END ******************************

    // acceptExecutionRequest func that checks whether function is executable or not
    // @DEV Problem related to having multiple functions (execute and withdraw). How can we differentiate which one gets passed in this function? => Solution, add a function idenifier into the calldata that we check and then redirect to
    function acceptExecutionRequest(bytes calldata _payload)
        external
        pure
        returns (uint256)
    {
        bytes memory testBytes = payload;
        require(payload.length > 4);
        bytes4 funcSelector;
        assembly {
            // Aim: We put the funcSelector on the stack to access it outside of assembly
            // How: Get the pointer of the payload in memory (== testBytes) and add 32 bytes (==0x20 hex) to point to where the actual data of the function selector lies, skipping the length bit (always first 32 bytes).
            // Bind this pointer to funcSelector, which when using it in solidity ignores the encoded data which comes directly after the first word (functionSelector == bytes4)
            // In short: Read the first 32 bytes by loading the word that starts at memory location testBytes + 32 bytes (==0x20 hex) and bind to funcSelector
            funcSelector := mload(add(0x20, testBytes))

            // Aim: Get rid of the funcSelector Data
            // How: Load the first word of the testBytes array (== length of the data) and subtract it by 4
            // Then store this updated length which got rid of the first 4 bytes (== funcSelector) at memory location testBytes + 4
            // Mstore: Store the word derived in the second parameter at the location specified by the first parameter
            // Q: Does sub(mload(testBytes), 4) update the word that stores the length of the data, which automatically prunes the first 4 bytes of the part that stores the data?
            mstore(
                // At position testBytes + 4
                add(testBytes, 4),
                // Load the first word of the testBytes bytes array == length of the bytes and deduct it by 4
                sub(mload(testBytes), 4)
            )
            // Skip the first 4 bytes (function signature)
            // Overwrite testBytes by binding the memory pointer of testBytes + 4 to key testBytes
            testBytes := add(testBytes, 4)

        }

        uint256 executionClaimId =  abi.decode(testBytes, (uint256));
        return 0;
    }


    // ****************************  execDepositAndSell(executionClaimId) *********************************
    /**
     * DEV: Called by the execute func in GelatoCore.sol
     * Aim: Post sellOrder on the DutchExchange via depositAndSell()
     */
    function execDepositAndSell(uint256 _executionClaimId)
        external
        returns (bool)
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoInterface.execute: msg.sender != gelatoCore instance address"
        );

        // Step2: Create storage pointer for the individual sellOrder and the parent orderState
        // Fetch SellOrder
        SellOrder storage sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];

        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState storage orderState = orderStates[orderStateId];

        // Step3: Check the condition: Execution Time
        checkTimeCondition(sellOrder.executionTime);

        // Step4: initialise multi-use variables
        // ********************** Load variables from storage and initialise them **********************
        address sellToken = orderState.sellToken;
        address buyToken = orderState.buyToken;
        uint256 amount = sellOrder.amount;
        // the last DutchX auctionIndex at which the orderState participated in
        uint256 lastAuctionIndex = orderState.lastAuctionIndex;  // default: 0
        // ********************** Load variables from storage and initialise them END **********************

        // Step5: Fetch auction specific data from Dutch Exchange
        // ********************** Fetch data from dutchExchange **********************
        uint256 newAuctionIndex = dutchExchange.getAuctionIndex(sellToken, buyToken);
        uint256 auctionStartTime = dutchExchange.getAuctionStart(sellToken, buyToken);
        // ********************** Fetch data from dutchExchange END **********************

        // Step6: Check if interface has enough funds to sell on the Dutch Exchange
        require(
            ERC20(sellToken).balanceOf(address(this)) >= amount,
            "GelatoInterface.execute: ERC20(sellToken).balanceOf(address(this)) !>= subOrderSize"
        );

        // Step7: Set the auction specific orderState variables
        // Waiting Period variables needed to prevent double participation in DutchX auctions
        bool lastAuctionWasWaiting = orderState.lastAuctionWasWaiting;  // default: false
        bool newAuctionIsWaiting;
        // Check if we are in a Waiting period or auction running period
        if (auctionStartTime > now || auctionStartTime == auctionStartWaitingForFunding) {
            newAuctionIsWaiting = true;
        } else if (auctionStartTime < now) {
            newAuctionIsWaiting = false;
        }

        // Step7: Check auciton Index and call depositAndSell
        /* Assumptions:
            * 1: Don't sell in the same auction twice
        */
        // CASE 1:
        // Check case where lastAuctionIndex is greater than newAuctionIndex
        require(newAuctionIndex >= lastAuctionIndex,
            "Case 1: Fatal error, Gelato auction index ahead of dutchExchange auction index"
        );

        // CASE 2:
        // Either we already posted during waitingPeriod OR during the auction that followed
        if (newAuctionIndex == lastAuctionIndex) {
            // Case2a: Last posted during waitingPeriod1, new CANNOT sell during waitingPeriod1.
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Case2a: Last posted during waitingPeriod1, new CANNOT sell during waitingPeriod1");
            }
            /* Case2b: We posted during waitingPeriod1, our funds went into auction1,
            now auction1 is running, now we sell again during auction1, as this time our funds would go into auction2. */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // As execDepositAndSell and execWithdraw are decoupled, we can safely sell our funds into the new auction as the only assumption we still hold is not selling in the same auction twice

                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = newAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
                (sellOrder.amount, dutchXFee) = _calcActualSellAmount(amount);

                emit LogActualSellAmount(_executionClaimId,
                                            orderStateId,
                                            amount,
                                            sellOrder.amount,
                                            dutchXFee
                );
                // Mark sellOrder as posted
                sellOrder.posted = true;
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(sellToken, buyToken, amount);
            }
            /* Case2c Last posted during running auction1, new tries to sell during waiting period
            that preceded auction1 (impossible time-travel) or new tries to sell during waiting
            period succeeding auction1 (impossible due to auction index incrementation ->
            newAuctionIndex == lastAuctionIndex cannot be true - Gelato-dutchExchange indexing
            must be out of sync) */
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Case2c: Fatal error: auction index incrementation out of sync");
            }
            // Case2d: Last posted during running auction1, new CANNOT sell during auction1.
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                revert("Case2d: Selling twice into the same running auction is disallowed");
            }
        }
        // CASE 3:
        // We participated at previous auction index
        // Either we posted during previous waiting period, or during previous auction.
        else if (newAuctionIndex == lastAuctionIndex.add(1)) {
            /* Case3a: We posted during previous waiting period, our funds went into auction1,
            then auction1 ran, then auction1 cleared and the auctionIndex got incremented,
            we now sell during the next waiting period, our funds will go to auction2 */
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = newAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
                (sellOrder.amount, dutchXFee) = _calcActualSellAmount(amount);

                emit LogActualSellAmount(_executionClaimId,
                                            orderStateId,
                                            amount,
                                            sellOrder.amount,
                                            dutchXFee
                );
                // Mark sellOrder as posted
                sellOrder.posted = true;
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(sellToken, buyToken, amount);
            }
            /* Case3b: We posted during previous waiting period, our funds went into auction1, then
            auction1 ran, then auction1 cleared and the auction index was incremented,
            , then a waiting period passed, now we are selling during auction2, our funds
            will go into auction3 */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // ### EFFECTS ###
                // Update Order State
                orderState.lastAuctionWasWaiting = newAuctionIsWaiting;
                orderState.lastAuctionIndex = newAuctionIndex;
                uint256 dutchXFee;
                // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
                (sellOrder.amount, dutchXFee) = _calcActualSellAmount(amount);

                emit LogActualSellAmount(_executionClaimId,
                                            orderStateId,
                                            amount,
                                            sellOrder.amount,
                                            dutchXFee
                );

                // Mark sellOrder as posted
                sellOrder.posted = true;
                // ### EFFECTS END ###

                // INTERACTION: sell on dutchExchange
                _depositAndSell(sellToken, buyToken, amount);
            }
            /* Case3c: We posted during auction1, our funds went into auction2, then auction1 cleared
            and the auction index was incremented, now we are NOT selling during the ensuing
            waiting period because our funds would also go into auction2 */
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Case3c: Failed: Selling twice during auction and ensuing waiting period disallowed");
            }
            /* Case3d: We posted during auction1, our funds went into auction2, then auction1
            cleared and the auctionIndex got incremented, then a waiting period passed, now
            we DO NOT sell during the running auction2, even though our funds will go to
            auction3 because we only sell after the last auction that we contributed to
            , in this case auction2, has been cleared and its index incremented */
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // Given new assumption of not wanting to sell in newAuction before lastAuction posted-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
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
            uint256 dutchXFee;
            // Update sellOrder.amount so when an executor calls execWithdraw, the seller receives withdraws the correct amount given sellAmountMinusFee
            (sellOrder.amount, dutchXFee) = _calcActualSellAmount(amount);

            emit LogActualSellAmount(_executionClaimId,
                                        orderStateId,
                                        amount,
                                        sellOrder.amount,
                                        dutchXFee
            );

            // Mark sellOrder as posted
            sellOrder.posted = true;
            // ### EFFECTS END ###


            // INTERACTION: sell on dutchExchange
            _depositAndSell(sellToken, buyToken, amount);
        }
        // Case 5: Unforeseen stuff
        else {
            revert("Case5: Fatal Error: Case5 unforeseen");
        }
        // ********************** Step7: Execution Logic END **********************

        // Step8:  Check if interface still has sufficient balance on core. If not, add balance. If yes, skipp.
        automaticTopUp();

        return true;
    }
    // **************************** IcedOut execute(executionClaimId) END *********************************

    // Withdraw function executor will call
    function execWithdraw(uint256 _executionClaimId)
        public
    {
        // Step1: Checks for execution safety
        // Make sure that gelatoCore is the only allowed caller to this function.
        // Executors will call this execute function via the Core's execute function.
        require(msg.sender == address(gelatoCore),
            "GelatoInterface.execute: msg.sender != gelatoCore instance address"
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
        require(sellOrder.posted, "Sell Order must have been posted in order to withdraw");

        // DEV use memory value lastAuctionIndex & sellAmountAfterFee as we already updated storage values
        uint256 amount = sellOrder.amount;

        // delete sellOrders[sellOrderExecutionClaimId];
        // // delete slink
        // delete sellOrderLink[_executionClaimId];
        // delete sellOrder
        delete sellOrders[_executionClaimId][_executionClaimId - 1];

        // Calculate withdraw amount
        uint256 withdrawAmount = _withdraw(seller,
                                           orderState.sellToken,
                                           orderState.buyToken,
                                           orderState.lastAuctionIndex,
                                           amount //Actual amount posted
        );

        // Event emission
        emit LogWithdrawComplete(_executionClaimId,
                                 orderStateId,
                                 seller,
                                 orderState.buyToken,
                                 withdrawAmount
        );

        // Delete OrderState struct when last withdrawal completed
        // if (orderState.remainingWithdrawals == 0) {
        //     delete orderStates[orderId];
        //     emit LogOrderCompletedAndDeleted(orderId);
        // }
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
            "withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
        );

        emit LogWithdrawAmount(num, den, _sellAmountAfterFee.mul(num).div(den));

        // Callculate withdraw amount
        withdrawAmount = _sellAmountAfterFee.mul(num).div(den);

    }
    // **************************** Helper functions END *********************************



    // **************************** Extra functions *********************************
    // Allows sellers to cancel their deployed orders
    // @🐮 create cancel heloer on IcedOut.sol

    function cancelOrder(uint256 _executionClaimId)
        public
        returns(bool)
    {
        // Step1: Find out if claim id is for execDepositAndSell or execWithdraw
        // Check if it is the former
        SellOrder memory sellOrder = sellOrders[_executionClaimId + 1][_executionClaimId];

        // #### CHECKS ####

        // If the posted == true, we know it must be a withdrawClaim, which cannot be cancelled
        require(sellOrder.posted == false, "Only executionClaims that havent been executed yet can be cancelled");
        require(sellOrder.amount != 0, "Only executionClaims that have a postive amount can be cancelled");

        address seller = gelatoCore.ownerOf(_executionClaimId);

        // Only Execution Claim Owner can cancel
        require(msg.sender == seller, "Only the executionClaim Owner can cancel the execution");

        // #### CHECKS END ####

        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;
        OrderState memory orderState = orderStates[orderStateId];

        // CHECKS: msg.sender == executionClaimOwner is checked by Core

        // ****** EFFECTS ******
        // Emit event before deletion/burning of relevant variables
        emit LogOrderCancelled(_executionClaimId, orderStateId, seller);
        emit LogOrderCancelled(_executionClaimId.add(1), orderStateId, seller);

        // Cancel both execution Claims on core
        // ** Gelato Core interactions **
        gelatoCore.cancelExecutionClaim(_executionClaimId);
        gelatoCore.cancelExecutionClaim(_executionClaimId.add(1));
        // ** Gelato Core interactions END **

        // Fetch variables needed before deletion
        address sellToken = orderState.sellToken;
        uint256 sellAmount = sellOrder.amount;

        // This deletes the withdraw struct as well as they both map to the same struct
        // delete sellOrders[_executionClaimId];
        // delete sellOrderLink[_executionClaimId.add(1)];
        // delete sellOrder
        delete sellOrders[_executionClaimId + 1][_executionClaimId];
        // ****** EFFECTS END ******

        // ****** INTERACTIONS ******
        // transfer sellAmount back from this contracts ERC20 balance to seller
        // REFUND USER!!!
        // In order to refund the exact amount the user prepaid, we need to store that information on-chain
        msg.sender.transfer(orderState.prepaymentPerSellOrder);

        // Transfer ERC20 Tokens back to seller
        safeTransfer(sellToken, msg.sender, sellAmount, false);

        // ****** INTERACTIONS END ******

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
    function withdrawManually(uint256 _executionClaimId)
        external
        returns(bool)
    {
        // Fetch owner of execution claim
        address seller = gelatoCore.ownerOf(_executionClaimId);

        // Fetch SellOrder
        SellOrder memory sellOrder = sellOrders[_executionClaimId][_executionClaimId - 1];

        // DEV use memory value lastAuctionIndex & sellAmountAfterFee as we already updated storage values
        uint256 amount = sellOrder.amount;

        // Fetch OrderState
        uint256 orderStateId = sellOrder.orderStateId;

        OrderState memory orderState = orderStates[orderStateId];

        // ******* CHECKS *******
        // If amount == 0, struct has already been deleted
        require(amount != 0, "Amount for manual withdraw cannot be zero");
        // Only Execution Claim Owner can withdraw manually
        require(msg.sender == seller, "Only the executionClaim Owner can cancel the execution");
        // Check whether posted == true
        require(sellOrder.posted == true, "Sell Order must have been posted in order to withdraw");

        // Fetch Order state

        // Fetch price of last participated in and cleared auction using lastAuctionIndex
        uint256 num;
        uint256 den;
        (num, den) = dutchExchange.closingPrices(orderState.sellToken, orderState.buyToken, orderState.lastAuctionIndex);

        // Require that the last auction the seller participated in has cleared
        require(den != 0,
            "withdrawManually: den != 0, Last auction did not clear thus far, you have to wait"
        );
        // ******* CHECKS END *******

        // ******* EFFECTS *******
        // Delete sellOrder Struct
        // delete sellOrders[sellOrderExecutionClaimId];
        // delete sellOrderLink[_executionClaimId];
        delete sellOrders[_executionClaimId][_executionClaimId - 1];
        // ******* EFFECTS END*******

        // ******* INTERACTIONS *******

        // Cancel execution claim on core
        gelatoCore.cancelExecutionClaim(_executionClaimId);

        // Initiate withdraw
        _withdraw(seller,  // seller
                  orderState.sellToken,
                  orderState.buyToken,
                  orderState.lastAuctionIndex,
                  amount
        );

        // ******* INTERACTIONS *******

        // Success
        return true;
    }

}


