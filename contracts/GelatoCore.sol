pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/Ownable.sol';
import './base/SafeMath.sol';

contract GelatoCore is Ownable() {

    // Libraries used:
    using SafeMath for uint256;

    struct ChildOrder {
        bytes32 parentOrderHash;
        address trader;
        address sellToken;
        address buyToken;
        uint256 childOrderSize;
        uint256 executionTime;
        uint256 executorRewardPerChildOrder;
    }

    // Events
    event LogNewChildOrderCreated(address indexed dappInterface,  // IMPORTANT FILTER: executor's main choice
                                  address trader,  // no filter: logic via parentOrderHash
                                  bytes32 indexed parentOrderHash,  // filters for sell orders
                                  bytes32 childOrderHash,  // no filter: can all be retrieved via parentOrderHash
                                  uint256 indexed executionTime,  // filters for execution time
                                  uint256 executorRewardPerChildOrder,  // no filter: logic via dappInterface
    );
    event LogChildOrderExecuted(bytes32 indexed childOrderHash,
                                address indexed trader,
                                address indexed executor,
                                uint256 executorRewardPerChildOrder
    );
    event LogExecutorPayout(bytes32 indexed childOrderHash,
                            address payable indexed executor,
                            uint256 indexed executorRewardPerChildOrder
    );


    // **************************** State Variables ******************************

    // childOrderHash => childOrder
    mapping(bytes32 => ChildOrder) public childOrders;

    // trader => childOrders
    mapping(address => bytes32[]) public childOrdersByTrader;

    // **************************** State Variables END ******************************


    // **************************** splitSchedule() ******************************
    function splitSchedule(bytes32 _parentOrderHash,
                           address _trader,
                           address _sellToken,
                           address _buyToken,
                           uint256 _totalOrderVolume,
                           uint256 _numChildOrders,
                           uint256 _childOrderSize,
                           uint256 _executionTime,
                           uint256 _intervalSpan,
                           uint256 _executorRewardPerChildOrder
    )
        public
        payable
        returns (bool)
    {
        // Zero value preventions
        require(_trader != address(0), "Trader: No zero addresses allowed");
        require(_sellToken != address(0), "sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "buyToken: No zero addresses allowed");
        require(_totalOrderVolume != 0, "totalOrderVolume cannot be 0");
        require(_numChildOrders != 0, "numChildOrders cannot be 0");
        require(_childOrderSize != 0, "childOrderSize cannot be 0");

        /* Invariants requirements
            * 1: childOrderSizes from one parent order are constant.
                * totalOrderVolume == numChildOrders * childOrderSize.
            * 2: executorRewardPerChildOrder from one parent order is constant.
                * msg.value == numChildOrders * executorRewardPerChildOrder
        */

        // @DEV: should cap the number of child orders possible after benchmarking gas usage

        // Invariant1: Constant childOrderSize
        require(_totalOrderVolume == _numChildOrders.mul(_childOrderSize),
            "Failed Invariant1: totalOrderVolume = numChildOrders * childOrderSize"
        );

        // Invariants2: Executor reward per childOrder and tx endowment checks
        require(msg.value == _numChildOrders.mul(_executorRewardPerChildOrder),
            "Failed Invariant2: msg.value == numChildOrders * executorRewardPerChildOrder"
        );

        // Local variable for reassignments to the executionTimes of
        //  sibling child orders because the former differ amongst the latter.
        uint256 memory executionTime = _executionTime;

        // Create all childOrders
        for (uint256 i = 0; i < _numChildOrders; i++) {
            // Instantiate (in memory) each childOrder (with its own executionTime)
            ChildOrder memory childOrder = ChildOrder(
                _parentOrderHash,
                _trader,
                _sellToken,
                _buyToken,
                _childOrderSize,
                executionTime,  // Differs across siblings
                _executorRewardPerChildOrder
            );

            // calculate ChildOrder Hash - the executionTime differs amongst the children of the parentOrder
            bytes32 childOrderHash = keccak256(abi.encodePacked(_parentOrderHash, executionTime));

            // Prevent overwriting stored sub orders because of hash collisions
            if (childOrders[childOrderHash].trader != address(0)) {
                revert("childOrder already registered. Identical childOrders disallowed");
            }

            // Store each childOrder in childOrders state variable mapping
            childOrders[childOrderHash] = childOrder;

            // Store each childOrder in childOrdersByTrader array by their hash
            childOrdersByTrader[_trader].push(childOrderHash);

            // Emit event to notify executors that a new sub order was created
            emit LogNewChildOrderCreated(msg.sender,  // == the calling interface
                                         _trader,
                                         _parentOrderHash,
                                         childOrderHash,
                                         _executorRewardPerChildOrder,
                                         executionTime  // Differs across siblings

            );

            // Increment the execution time
            executionTime += _intervalSpan;
        }

        // Return true to caller (dappInterface)
        return true;
    }
    // **************************** splitSchedule() END ******************************


}


