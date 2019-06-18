pragma solidity >=0.4.21 <0.6.0;

//Imports:
import './base/ERC20.sol';
import './base/SafeMath.sol';
import './base/Ownable.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
// import '@gnosis.pm/dx-contracts/contracts/base/SafeTransfer.sol';
// import "@gnosis.pm/util-contracts/contracts/Token.sol";

contract Gelato is Ownable() {

    // Libraries used:
    using SafeMath for uint256;

    // The key data structure of the Gelato Sellduler
    /* @Hilmar: we need to think about seeting an execution window,
            but maybe external cancellation suffices,
            instead of built-in internal mechanism.
    */
    struct SellOrder {
        bool lastAuctionWasWaiting;
        bool cancelled;  // Indicates if SellOrder is cancelled: default: false
        bool complete;  // Indicates if SellOrder is complete: default: false
        address seller; // Seller
        address sellToken; // e.g. WETH address
        address buyToken; // e.g. DAI address
        uint256 totalSellVolume; // eg. 100 WETH
        uint256 subOrderSize; // e.g. 10 WETH
        uint256 numSubOrders; // e.g. 10
        uint256 hammerTime; // e.g. 1559912739
        uint256 freezeTime; // e.g. 86400 seconds (24h)
        uint256 lastAuctionIndex; // default 0
        uint256 executionReward; // e.g. 0.1 ETH
        uint256 actualLastSubOrderAmount;
        //address payable[] executors;  // dynamic array
    }

    /* Invariants
        * 1: subOrderSize is constant
        * 2: totalSellVolume === subOrderSize * numSubOrders;
    */

    // Events

    event LogNewSellOrderCreated(bytes32 indexed sellOrderHash,
                          address indexed seller,
                          uint256 indexed hammerTime
    );
    event LogSubOrderExecuted(bytes32 indexed sellOrderHash,
                              address indexed seller,
                              address indexed executor
    );
    event LogClaimedAndWithdrawn(bytes32 indexed sellOrderHash,
                                 address indexed seller
    );
    event LogNewHammerTime(bytes32 indexed sellOrderHash,
                           address indexed seller,
                           uint256 indexed hammerTime
    );
    event LogExecutorPayout(bytes32 indexed sellOrderHash,
                            address payable indexed executor,
                            uint256 executionReward
    );
    event LogSellOrderCancelled(bytes32 indexed sellOrderHash,
                                address indexed seller
    );
    event LogSellOrderComplete(bytes32 indexed sellOrderHash,
                               address indexed seller,
                               address indexed executor
    );

    event LogNumDen(uint indexed num, uint indexed den);

    event LogWithdrawAmount(uint indexed withdrawAmount);

    event LogActualSubOrderAmount(uint256 indexed subOrderAmount,uint256 indexed actualSubOrderAmount, uint256 indexed fee);

    // State Variables
    /*Mappings:
        * Unique key-value mapping:
            * key: sellOrderHash
            * value: sellOrder (struct)
    */
    mapping(bytes32 => SellOrder) public sellOrders;

    /* Interface to other contracts:
        * DutchX variables:
            * https://dutchx.readthedocs.io/en/latest/smart-contracts_addresses.html
            * DutchX 2.0 - dxDAO: Rinkeby: 0x2bAE491B065032a76BE1dB9e9eCf5738aFAe203E
            * address DUTCHX_RINKEBY = "0x7b7DC59ADBE59CA4D0eB32042fD5259Cf5329DE1";
    */
    DutchExchange public DutchX;

    uint256 public AUCTION_START_WAITING_FOR_FUNDING;

    // END: State Variables


    /* constructor():
        * makes upgradeability easy via redeployment.
        * constructs Ownable base and sets msg.sender as owner.
    */
    constructor(address deployedAt)
        public
    {
        DutchX = DutchExchange(deployedAt);
        AUCTION_START_WAITING_FOR_FUNDING = 1;
    }


    /* Functions:
        * createSellOrder()
        * executeSubOrder()
        * _depositAndSell()
    /* Function 1: createSellOrder()
            * Anyone can create a sellOrder.
            * Supplied parameters are required to have:
                * no zero addresses
                * a no-zero totalSellVolume
                * a no-zero subOrderSize
                * a hammerTime more than 10 minutes into the future
                * a numSubOrders equal to totalSellVolume / subOrderSize
                * an even numSubOrders
            * Emits LogNewSellOrder event.
            * Returns: unique sellOrderHash
    */
    function createSellOrder(address _sellToken,
                             address _buyToken,
                             uint256 _totalSellVolume,
                             uint256 _subOrderSize,
                             uint256 _numSubOrders,
                             uint256 _hammerTime,
                             uint256 _freezeTime,
                             uint256 _executionReward,
                             uint256 _nonce
    )
        public
        returns (bytes32)

    {
        // Argument checks
        require(msg.sender != address(0), "No zero addresses allowed");
        require(_buyToken != address(0), "No zero addresses allowed");
        require(_sellToken != address(0), "No zero addresses allowed");
        require(_totalSellVolume != 0, "Empty sell volume");
        require(_subOrderSize != 0, "Empty sub order size");

        // Invariant checks
        require(_totalSellVolume == _numSubOrders.mul(_subOrderSize),
            "Invariant numSubOrders failed totalSellVolume/subOrderSize"
        );

        // @ Hilmar: Readability over gas cost. - or no?
        address seller = msg.sender;

        // Local variables
        uint256 lastAuctionIndex = 0;

        // Create new sellOrder struct based on user input
        /* Question: what about initalising executors array?
           @Hilmar: lastAuctionIndex should be modifiable by
            seller, in case seller submits multiple sell orders of
            same pairing while other sellOrder still active.
        */
        SellOrder memory sellOrder = SellOrder(
            false,
            false,
            false,
            seller,
            _sellToken,
            _buyToken,
            _totalSellVolume,
            _subOrderSize,
            _numSubOrders,
            _hammerTime,
            _freezeTime,
            lastAuctionIndex,
            _executionReward,
            0 //default for actualLastSubOrderAmount
        );

        // Hash the sellOrder Struct to get unique identifier for mapping
        // @Hilmar: solidity returns sellOrderHash automatically for you
        bytes32 sellOrderHash = keccak256(abi.encodePacked(seller, _sellToken, _buyToken, _totalSellVolume, _subOrderSize, _numSubOrders, _hammerTime, _freezeTime, lastAuctionIndex, _executionReward, _nonce));

        // We cannot convert a struct to a bool, hence we need to check if any value is not equal to 0 to validate that it does indeed not exist
        if (sellOrders[sellOrderHash].seller != address(0)) {
            revert("Sell Order already registered");
        }

        sellOrders[sellOrderHash] = sellOrder;

        //Emit event to notify executors that a new order was created
        emit LogNewSellOrderCreated(sellOrderHash, seller, _hammerTime);

        return sellOrderHash;
    }


    function executeSubOrder(bytes32 sellOrderHash)
        public
        returns (bool success)
    {
        SellOrder storage subOrder = sellOrders[sellOrderHash];

         // Local variables for readability
        /* Need to double check storage pointer logic here:
           * if we assign to new variables, do our values make it into storage?
        */
        // default: false
        bool lastAuctionWasWaiting = subOrder.lastAuctionWasWaiting;
        // Default to 0 for first execution;
        uint256 lastAuctionIndex = subOrder.lastAuctionIndex;

        // Fetches current auction index from DutchX
        uint256 newAuctionIndex = DutchX.getAuctionIndex(subOrder.buyToken, subOrder.sellToken);

        uint256 actualLastSubOrderAmount = subOrder.actualLastSubOrderAmount;

        /* Basic Execution Logic
            * Require that seller has ERC20 balance
            * Require that Gelato has matching seller's ERC20 allowance
            * Require that subOrder is ready to be executed based on time
        */

        // Execute if the order was not cancelled
        require(!subOrder.cancelled,
            "Failed: Sell Order has status cancelled."
        );

        // Execute if: It's hammerTime !
        require(subOrder.hammerTime <= now,
            "Failed: You called before scheduled execution time"
        );

        // Execute if: Seller has the balance.
        // @DEV Revisit based on payout logic
        require(
            // @DEV revisit adding execution reward based on payout logic
            ERC20(subOrder.sellToken).balanceOf(subOrder.seller) >= subOrder.subOrderSize,
            "Failed: Seller balance must be greater than subOrderSize"
        );

        // Execute if: Gelato has the allowance.
        require(
            ERC20(subOrder.sellToken)
            .allowance(subOrder.seller, address(this)) >= subOrder.subOrderSize,
            "Failed: Gelato allowance must be greater than subOrderSize"
        );

        // ********************** Basic Execution Logic END **********************


        // ********************** Advanced Execution Logic **********************

        // Define if the new auction is in the Waiting period or not, defaulting to false
        bool newAuctionIsWaiting;

        // Fetch DutchX auction start time
        uint auctionStartTime = DutchX.getAuctionStart(subOrder.sellToken, subOrder.buyToken);

        // require(auctionStartTime == 1, "AuctionStart should be equal to 1");

        // Check if we are in a Waiting period or auction running period
        // @Dev, we need to account for latency here
        if (auctionStartTime > now || auctionStartTime == AUCTION_START_WAITING_FOR_FUNDING) {
            newAuctionIsWaiting = true;
        } else if (auctionStartTime < now) {
            newAuctionIsWaiting = false;
        }

        // Assumpions:
        // #1 Don't sell in the same auction twice
        // #2 Don't sell into an auction before the prior auction you sold into has cleared so we can withdraw safely

        // CASE 1:
        // Check case where lastAuctionIndex is greater than newAuctionIndex
        require(newAuctionIndex >= lastAuctionIndex, "newAuctionIndex smaller than lastAuctionIndex");

        // CASE 2:
        // Either we already sold during waitingPeriod OR during the auction that followed
        if (newAuctionIndex == lastAuctionIndex) {
            // Last sold during waitingPeriod1, new CANNOT sell during waitingPeriod1.
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Last sold during waitingPeriod1, new CANNOT sell during waitingPeriod1");
            }
            // Last sold in Waiting period, new wants to sell afer auction started running
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // Given new assumption of not wanting to sell in newAuction before lastAuction sold-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
                revert("Even though we dont't sell into the same auciton twice, we would sell before the preivuos auction we sold into has finished, hence revert");
            }
            // Last sold during running auction, new sells during last waiting period
            // Impossible
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Fatal error: auction index incrementation out of sync");
            }
            //Last sold during running auction1, new CANNOT sell during auction1
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                revert("Failed: Selling twice into the same running auction is disallowed");
            }
        }
        // CASE 3:
        // We participated at previous auction index
        // Either we sold during previous waiting period, or during previous auction.
        else if (newAuctionIndex.sub(1) == lastAuctionIndex) {
            /* We sold during previous waiting period, our funds went into auction1,
            then auction1 ran, then auction1 cleared and the auctionIndex got incremented,
            we now sell during the next waiting period, our funds will go to auction2 */
            if (lastAuctionWasWaiting && newAuctionIsWaiting) {
                // Change in Auction Index
                subOrder.lastAuctionIndex = newAuctionIndex;
                // No Change in Auction State
                subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;
                // @DEV: before selling, transfer the ERC20 tokens from the user to the gelato contract
                ERC20(subOrder.sellToken).transferFrom(subOrder.seller, address(this), subOrder.subOrderSize);

                // @DEV: before selling, approve the DutchX to extract the ERC20 Token from this contract
                ERC20(subOrder.sellToken).approve(address(DutchX), subOrder.subOrderSize);

                // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                uint256 newActualSubOrderSize = _calcActualSubOrderSize(subOrder.subOrderSize);

                // Store the actually sold sub-order amount in the struct
                subOrder.actualLastSubOrderAmount = newActualSubOrderSize;

                // Sell
                _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize);
            }
            /* We sold during previous waiting period, our funds went into auction1, then
            auction1 ran, then auction1 cleared and the auction index was incremented,
            , then a waiting period passed, now we are selling during auction2, our funds
            will go into auction3 */
            else if (lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // Change in Auction Index
                subOrder.lastAuctionIndex = newAuctionIndex;
                // Change in Auction State
                subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;
                // @DEV: before selling, transfer the ERC20 tokens from the user to the gelato contract
                ERC20(subOrder.sellToken).transferFrom(subOrder.seller, address(this), subOrder.subOrderSize);

                // @DEV: before selling, approve the DutchX to extract the ERC20 Token from this contract
                ERC20(subOrder.sellToken).approve(address(DutchX), subOrder.subOrderSize);

                // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
                uint256 newActualSubOrderSize = _calcActualSubOrderSize(subOrder.subOrderSize);

                // Store the actually sold sub-order amount in the struct
                subOrder.actualLastSubOrderAmount = newActualSubOrderSize;

                // Sell
                _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize);
            }
            /* We sold during auction1, our funds went into auction2, then auction1 cleared
            and the auction index was incremented, now we are NOT selling during the ensuing
            waiting period because our funds would also go into auction2 */
            else if (!lastAuctionWasWaiting && newAuctionIsWaiting) {
                revert("Failed: Selling twice during auction and ensuing waiting period disallowed");
            }
            /* We sold during auction1, our funds went into auction2, then auction1 cleared
            and the auctionIndex got incremented, then a waiting period passed,
            we now sell during auction2, our funds will go to auction3 */
            else if (!lastAuctionWasWaiting && !newAuctionIsWaiting) {
                // Given new assumption of not wanting to sell in newAuction before lastAuction sold-into has finished, revert. Otherwise, holds true for not investing in same auction assupmtion
                revert("Even though we dont't sell into the same auciton twice, we would sell before the preivuos auction we sold into has finished, hence revert");
            }
        }
        // CASE 4:
        // If we skipped at least one auction before trying to sell again: ALWAYS SELL
        else if (newAuctionIndex.sub(2) >= lastAuctionIndex) {
            // Change in Auction Index
            subOrder.lastAuctionIndex = newAuctionIndex;

            // Change in Auction State
            subOrder.lastAuctionWasWaiting = newAuctionIsWaiting;

            // @DEV: before selling, transfer the ERC20 tokens from the user to the gelato contract
            ERC20(subOrder.sellToken).transferFrom(subOrder.seller, address(this), subOrder.subOrderSize);

            // @DEV: before selling, approve the DutchX to extract the ERC20 Token from this contract
            ERC20(subOrder.sellToken).approve(address(DutchX), subOrder.subOrderSize);

            // @DEV: before selling, calc the acutal amount which will be sold after DutchX fee deduction to be later used in the withdraw pattern
            uint256 newActualSubOrderSize = _calcActualSubOrderSize(subOrder.subOrderSize);

            // Store the actually sold sub-order amount in the struct
            subOrder.actualLastSubOrderAmount = newActualSubOrderSize;

            // Sell
            _depositAndSell(subOrder.sellToken, subOrder.buyToken, subOrder.subOrderSize);

        }
        // Case 5: Unforeseen stuff
        else {
            revert("Fatal Error: Case5 unforeseen.");
        }
        // ********************** Advanced Execution Logic END **********************

        // ##### UNTIL HERE IT'S SOLID, now comes old code ####

        /* ********************** Update Sell Order **********************
          @ Luis: reavaluate executor array logic maybe reinstate remainingSubOrders variable
        */

        // @DEV, make work like this or with remainingAuction count
        // bool lastExecutor = subOrder.executors.length == subOrder.numSubOrders.sub(1);

        // subOrder.executors.push(executor);

        // if (!lastExecutor) {
        //     subOrder.hammerTime = subOrder.hammerTime.add(subOrder.freezeTime);
        //     emit LogNewHammerTime(sellOrderHash, subOrder.seller, subOrder.hammerTime);
        // }
        // else if (lastExecutor) {
        //     assert(subOrder.executors.length == subOrder.numSubOrders);
        //     subOrder.complete = true;
        //     emit LogSellOrderComplete(sellOrderHash, subOrder.seller, executor);
        // }

        // ********************** Update Sell Order END **********************


        // ********************** TO DO: IMPLEMENT executionReward LOGIC **********************

        // ********************** TO DO: IMPLEMENT executionReward LOGIC END ******************



        // ********************** Withdraw from DutchX **********************

        // Only enter after first sub-order sale
        // Only enter if last auction the seller participated in has cleared
        // @DEV use memory value lastAuctionIndex as we already incremented storage value
        if (lastAuctionIndex != 0) {

            // Calc how much the last auction the user paid into has yieled.
            uint256 withdrawAmount = _calcWithdrawAmount(subOrder.sellToken, subOrder.buyToken, lastAuctionIndex, actualLastSubOrderAmount);

            // Call claim and withdraw function
            // @DEV use memory value lastAuctionIndex as we already incremented storage value
            DutchX.claimAndWithdraw(subOrder.sellToken,
            subOrder.buyToken,
            address(this),
            lastAuctionIndex,
            withdrawAmount);

            // Transfer Tokens from Gelato to Seller
            // ERC20.transfer(address recipient, uint256 amount)
            ERC20(subOrder.buyToken).transfer(subOrder.seller, withdrawAmount);
        }

        // ********************** Withdraw from DutchX END **********************

        return true;
    }


    function cancelSellOrder(bytes32 sellOrderHash)
        public
        returns(bool)
    {
        SellOrder storage sellOrder = sellOrders[sellOrderHash];

        require(!sellOrder.cancelled,
            "Sell order was cancelled already"
        );
        require(msg.sender == sellOrder.seller,
            "Only seller can cancel the sell order"
        );

        sellOrder.cancelled = true;

        emit LogSellOrderCancelled(sellOrderHash, sellOrder.seller);

        return true;
    }


    // @ Hilmar: maybe do the same for withdrawal
    function _depositAndSell(address sellToken,
                            address buyToken,
                            uint256 amount
    )
        private
        returns(bool)
    {
        DutchX.depositAndSell(sellToken, buyToken, amount);

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

        emit LogNumDen(num, den);

        // Calc fee amount
        uint fee = _sellAmount.mul(num).div(den);

        // Calc actual Sell Amount
        uint actualSellAmount = _sellAmount.sub(fee);

        emit LogActualSubOrderAmount(_sellAmount, actualSellAmount, fee);

        return actualSellAmount;

        // Store fee amount in new state variable to call it in next sellOrders withdraw func
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

        emit LogNumDen(num, den);

        // For WETH / DAI we will get back e.g: 1/ 250
        uint256 withdrawAmount = (
            _actualLastSubOrderAmount.mul(num).div(den)
        );

        emit LogWithdrawAmount(withdrawAmount);

        return withdrawAmount;
    }

}


