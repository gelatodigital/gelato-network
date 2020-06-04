// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { Operation, Action, IGelatoCore, TaskReceipt } from "../gelato_core/interfaces/IGelatoCore.sol";
import { GelatoActionsStandard } from "../gelato_actions/GelatoActionsStandard.sol";
import { GelatoDebug } from "../libraries/GelatoDebug.sol";

/// @title GelatoMultiSend - Batch multiple transactions into one
/// @author Hilmar X (inspired by Gnosis' MultiSend)
contract GelatoMultiSend {

    using GelatoDebug for bytes;

    address public immutable callStateContext;

    constructor() public { callStateContext = address(this); }

    modifier noZeroAddress(address _) {
        require(_ != address(0), "GelatoMultiSend.noZeroAddress");
        _;
    }

    function multiSend(Action[] memory _actions) public {
        require(
            callStateContext != address(this),
            "GelatoMultiSend.multiSend: Only delegatecall"
        );
        bytes memory returnData;
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call) {
                if (_actions[i].termsOkCheck == true) {
                    returnData = _callAction(
                        _actions[i].addr,
                        abi.encodeWithSelector(
                            GelatoActionsStandard.gelatoInternal.selector,
                            _actions[i].data,
                            returnData
                        ),
                        _actions[i].value
                    );
                } else {
                    delete returnData;
                    _callAction(_actions[i].addr, _actions[i].data, _actions[i].value);
                }
            } else if (_actions[i].operation == Operation.Delegatecall) {
                if (_actions[i].termsOkCheck == true) {
                    returnData = _delegatecallAction(
                        _actions[i].addr,
                        abi.encodeWithSelector(
                            GelatoActionsStandard.gelatoInternal.selector,
                            _actions[i].data,
                            returnData
                        )
                    );
                } else {
                    delete returnData;
                    _delegatecallAction(_actions[i].addr, _actions[i].data);
                }
            }
        }
    }

    function _callAction(address _action, bytes memory _data, uint256 _value)
        internal
        noZeroAddress(_action)
        returns (bytes memory returnData)
    {
        bool success;
        (success, returnData) = _action.call{value: _value}(_data);
        if (!success) returnData.revertWithErrorString("GelatoMultiSend._callAction:");
    }

    function _delegatecallAction(address _action, bytes memory _data)
        internal
        noZeroAddress(_action)
        returns (bytes memory returnData)
    {
        bool success;
        (success, returnData) = _action.delegatecall(_data);
        if (!success) returnData.revertWithErrorString("GelatoMultiSend._delegatecallAction:");
    }
}