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
    }

    // Events
    event LogNewChildOrderCreated(address indexed dappInterface,  // IMPORTANT FILTER: executor's main choice
                                  address trader,  // no filter: logic via parentOrderHash
                                  bytes32 indexed parentOrderHash,  // filters for sell orders
                                  bytes32 childOrderHash  // no filter: can all be retrieved via parentOrderHash
    );


    // **************************** State Variables ******************************

    // childOrderHash => childOrder
    mapping(bytes32 => ChildOrder) public childOrders;

    // trader => childOrders
    mapping(address => bytes32[]) public childOrdersByTrader;

    // **************************** State Variables END ******************************


    // **************************** State Variable Getters ******************************

    function getChildOrder(bytes32 _childOrderHash)
        public
        view
        returns(
            bytes32 parentOrderHash,
            address trader,
            address sellToken,
            address buyToken,
            uint256 childOrderSize,
            uint256 executionTime

        )
    {
        ChildOrder memory childOrder = childOrders[_childOrderHash];
        return
        (
            childOrder.parentOrderHash,
            childOrder.trader,
            childOrder.sellToken,
            childOrder.buyToken,
            childOrder.childOrderSize,
            childOrder.executionTime
        );
    }

    // **************************** State Variable Getters END ******************************


    // **************************** splitSchedule() ******************************
    function splitSchedule(bytes32 _parentOrderHash,
                           address _trader,
                           address _sellToken,
                           address _buyToken,
                           uint256 _totalOrderVolume,
                           uint256 _numChildOrders,
                           uint256 _childOrderSize,
                           uint256 _executionTime,
                           uint256 _intervalSpan
    )
        external
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
        */

        // @DEV: capping number of child orders should be done at Gelato Interface Level
        //  after benchmarking by interface devs

        // Invariant1: Constant childOrderSize
        require(_totalOrderVolume == _numChildOrders.mul(_childOrderSize),
            "Failed Invariant1: totalOrderVolume = numChildOrders * childOrderSize"
        );


        // Local variable for reassignments to the executionTimes of
        //  sibling child orders because the former differ amongst the latter.
        uint256 executionTime = _executionTime;

        // Create all childOrders
        for (uint256 i = 0; i < _numChildOrders; i++) {
            // Instantiate (in memory) each childOrder (with its own executionTime)
            ChildOrder memory childOrder = ChildOrder(
                _parentOrderHash,
                _trader,
                _sellToken,
                _buyToken,
                _childOrderSize,
                executionTime  // Differs across siblings
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
                                         childOrderHash
            );

            // Increment the execution time
            executionTime += _intervalSpan;
        }

        // Return true to caller (dappInterface)
        return true;
    }
    // **************************** splitSchedule() END ******************************

}


