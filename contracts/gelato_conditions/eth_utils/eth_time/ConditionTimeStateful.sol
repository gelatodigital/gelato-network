// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {GelatoStatefulConditionsStandard} from "../../GelatoStatefulConditionsStandard.sol";
import {SafeMath} from "../../../external/SafeMath.sol";
import {IGelatoCore} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../../external/IERC20.sol";

contract ConditionTimeStateful is GelatoStatefulConditionsStandard {

    using SafeMath for uint256;

    // userProxy => taskReceiptId => refTime
    mapping(address => mapping(uint256 => uint256)) public refTime;

    constructor(IGelatoCore _gelatoCore)
        GelatoStatefulConditionsStandard(_gelatoCore)
        public
    {}

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(address _userProxy)
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(this.checkRefTime.selector, uint256(0), _userProxy);
    }

    // STANDARD interface
    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        address userProxy = abi.decode(_conditionData[36:], (address));
        return checkRefTime(_taskReceiptId, userProxy);
    }

    // Specific Implementation
    /// @dev Abi encode these parameter inputs. Use a placeholder for _taskReceiptId.
    /// @param _taskReceiptId Will be stripped from encoded data and replaced by
    ///  the value passed in from GelatoCore.
    function checkRefTime(uint256 _taskReceiptId, address _userProxy)
        public
        view
        virtual
        returns(string memory)
    {
        uint256 _refTime = refTime[_userProxy][_taskReceiptId];
        if (_refTime <= block.timestamp) return OK;
        return "NotOkTimestampDidNotPass";
    }

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// This is for Task Cycles/Chains and we fetch the TaskReceipt.id of the
    //  next Task that will be auto-submitted by GelatoCore in the same exec Task transaction.
    /// @param _timeDelta The time after which this condition should return for a given taskId
    /// @param _idDelta Default to 0. If you submit multiple tasks in one action, this can help
    // customize which taskId the state should be allocated to
    function setRefTime(uint256 _timeDelta, uint256 _idDelta) external {
        uint256 currentTime = block.timestamp;
        uint256 newRefTime = currentTime + _timeDelta;
        refTime[msg.sender][_getIdOfNextTaskInCycle() + _idDelta] = newRefTime;
    }
}
