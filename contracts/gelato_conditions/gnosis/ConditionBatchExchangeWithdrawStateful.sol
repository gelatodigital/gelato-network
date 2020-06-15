// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import "../GelatoStatefulConditionsStandard.sol";
import "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import {IGelatoCore} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract ConditionBatchExchangeWithdrawStateful is GelatoStatefulConditionsStandard {


    constructor(IGelatoCore _gelatoCore) GelatoStatefulConditionsStandard(_gelatoCore)
        public
        {}

    // userProxy => taskReceiptId => refBatchId
    mapping(address => mapping(uint256 => uint256)) public refBatchId;

    uint32 public constant BATCH_TIME = 300;

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(address _userProxy)
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(this.checkRefBatchId.selector, uint256(0), _userProxy);
    }

    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        address userProxy = abi.decode(_conditionData[36:], (address));
        return checkRefBatchId(_taskReceiptId, userProxy);
    }

    // Specific Implementation
    /// @dev Abi encode these parameter inputs. Use a placeholder for _taskReceiptId.
    /// @param _taskReceiptId Will be stripped from encoded data and replaced by
    ///  the value passed in from GelatoCore.
    function checkRefBatchId(uint256 _taskReceiptId, address _userProxy)
        public
        view
        virtual
        returns(string memory)
    {
        uint256 _refBatchId = refBatchId[_userProxy][_taskReceiptId];
        uint256 currentBatchId = uint32(block.timestamp / BATCH_TIME);
        if (_refBatchId < currentBatchId) return OK;
        return "NotOkBatchIdDidNotPass";
    }

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// This is for Task Cycles/Chains and we fetch the TaskReceipt.id of the
    //  next Task that will be auto-submitted by GelatoCore in the same exec Task transaction.
    function setRefBatchId(uint256 _delta, uint256 _idDelta) external {
        uint256 currentBatchId = uint32(block.timestamp / BATCH_TIME);
        uint256 newRefBatchId = currentBatchId + _delta;
        refBatchId[msg.sender][_getIdOfNextTaskInCycle() + _idDelta] = newRefBatchId;
    }
}