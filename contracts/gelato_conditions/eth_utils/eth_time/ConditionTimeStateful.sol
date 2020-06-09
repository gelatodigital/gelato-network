// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

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

    /// @param _checkRefTimeData abi encoded checkRefTime params WITHOUT selector
    function ok(uint256 _taskReceiptId, bytes calldata _checkRefTimeData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        // we strip the encoded _taskReceiptId and take the one passed by GelatoCore
        address userProxy = abi.decode(_checkRefTimeData[32:], (address));
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
    function setRefTime(uint256 _delta) external {
        uint256 currentTime = block.timestamp;
        uint256 newRefTime = currentTime + _delta;
        refTime[msg.sender][_getIdOfNextTaskInCycle()] = newRefTime;
    }
}
