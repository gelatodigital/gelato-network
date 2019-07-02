pragma solidity >=0.4.21 <0.6.0;

//Imports:
import './base/ERC20.sol';
import './base/SafeMath.sol';
import './base/Ownable.sol';
import '@gnosis.pm/dx-contracts/contracts/DutchExchange.sol';
// import '@gnosis.pm/dx-contracts/contracts/base/SafeTransfer.sol';
// import "@gnosis.pm/util-contracts/contracts/Token.sol";

contract GelatoCore is Ownable() {

    // Libraries used:
    using SafeMath for uint256;

    struct SubOrder {
        address trader;
        address sellToken;
        address buyToken;
        uint256 subOrderSize;
        uint256 executionTime;
        uint256 intervalSpan;
        uint256 executorRewardPerSubOrder;
    }

    // Events
    event LogNewSubOrderCreated(bytes32 indexed subOrderHash,
                                address indexed trader,
                                uint256 executorRewardPerSubOrder,
                                uint256 indexed executionTime
    );
    event LogSubOrderExecuted(bytes32 indexed subOrderHash,
                              address indexed trader,
                              address indexed executor,
                              uint256 executorRewardPerSubOrder
    );

    event LogExecutorPayout(bytes32 indexed subOrderHash,
                            address payable indexed executor,
                            uint256 indexed executionReward
    );



    // **************************** State Variables ******************************
    // Mappings:

    // Find unique subOrders by their hash
    mapping(bytes32 => SubOrder) public subOrders;

    // Find all subOrders of one single trader
    mapping(address => bytes32[]) public subOrdersByTrader;

    // Interface to other contracts:
    // @Dev: need to find out how to link to deployed interfaces dynamically,
    //  this should not be hardcoded.
    GelatoDutchX public GelatoDutchX;

    // **************************** State Variables END ******************************


    /* Invariants
        * 1: subOrderSize is constant inside one Order.
            * totalSellVolume == remainingSubOrder * subOrderSize.
        * 2: executorRewardPerSubOrder is constant inside one sell order.
            * msg.value / (remainingSubOrders + 1) == executorRewardPerSubOrder
        * 3: executorRewardPerSubOrder surpasses the minimum
            * executorRewardPerSubOrder >= MIN_EXECUTOR_REWARD_PER_SUBORDER
        * 4: IF (sellOrder.complete)
            * THEN remainingSubOrders == 0
            * THEN remainingWithdrawals == 0
            * THEN aggregatedExecutorReward == (numSubOrders + 1) * executorRewardPerSubOrder
    */


    // **************************** createSellOrder() ******************************
    function createSubOrder(bytes32 _orderHash,
                            address _trader,
                            address _sellToken,
                            address _buyToken,
                            uint256 _totalSellVolume,
                            uint256 _subOrderSize,
                            uint256 _remainingSubOrders,
                            uint256 _executionTime,
                            uint256 _intervalSpan,
                            uint256 _executorRewardPerSubOrder
    )
        public
        payable
        returns (bytes32)

    {
        // Argument checks
        require(msg.sender != address(0), "No zero addresses allowed");
        require(_buyToken != address(0), "No zero addresses allowed");
        require(_sellToken != address(0), "No zero addresses allowed");
        require(_totalSellVolume != 0, "Empty sell volume");
        require(_subOrderSize != 0, "Empty sub order size");

        // Require so that trader cannot call execSubOrder for a sellOrder with remainingSubOrder == 0
        require(_remainingSubOrders != 0, 'You need at least 1 subOrder per sellOrder');

        // Invariant checks
        // Invariant1: Constant subOrdersize in one sell order check
        require(_totalSellVolume == _remainingSubOrders.mul(_subOrderSize),
            "Invariant remainingSubOrders failed totalSellVolume/subOrderSize"
        );

        // Invariants 2 & 3: Executor reward per subOrder + 1(last withdraw) and tx endowment checks
        require(msg.value >= (_remainingSubOrders.add(1)).mul(_executorRewardPerSubOrder),
            "Failed invariant Test2: msg.value =>  (remainingSubOrders + 1) * executorRewardPerSubOrder"
        );

        require(_executorRewardPerSubOrder >= MIN_EXECUTOR_REWARD_PER_SUBORDER,
            "Failed invariant Test3: Msg.value (wei) must pass the executor reward per subOrder minimum (MIN_EXECUTOR_REWARD_PER_SUBORDER)"
        );

        // Local variables
        address trader = msg.sender;

        // RemainingWithdrawals by default set to remainingSubOrders
        uint256 remainingWithdrawals = _remainingSubOrders;

        // Create new sell order
        SellOrder memory sellOrder = SellOrder(
            false, // lastAuctionWasWaiting
            false, // complete?
            // false, // cancelled?
            trader,
            _sellToken,
            _buyToken,
            _totalSellVolume,
            _subOrderSize,
            _remainingSubOrders,
            _executionTime,
            _intervalSpan,
            0, //lastAuctionIndex
            _executorRewardPerSubOrder,
            0 /*default for actualLastSubOrderAmount*/,
            remainingWithdrawals /* remainingWithdrawals == _remainingSubOrders */
        );

        // Hash the sellOrder Struct to get unique identifier for mapping
        // @Hilmar: solidity returns subOrderHash automatically for you
        bytes32 subOrderHash = keccak256(abi.encodePacked(trader, _sellToken, _buyToken, _totalSellVolume, _subOrderSize, _remainingSubOrders, _executionTime, _intervalSpan, _executorRewardPerSubOrder));

        // We cannot convert a struct to a bool, hence we need to check if any value is not equal to 0 to validate that it does indeed not exist
        if (sellOrders[subOrderHash].trader != address(0)) {
            revert("Sell Order already registered. Identical sellOrders disallowed");
        }

        // Store new sell order in sellOrders mapping
        sellOrders[subOrderHash] = sellOrder;

        // Store new sellOrders in sellOrdersBytrader array by their hash
        sellOrdersBytrader[trader].push(subOrderHash);

        //Emit event to notify executors that a new order was created
        emit LogNewSellOrderCreated(subOrderHash, trader, _executorRewardPerSubOrder, _executionTime);

        return subOrderHash;
    }

    // **************************** createSellOrder() END ******************************


}


