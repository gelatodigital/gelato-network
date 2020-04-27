pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../../GelatoProviderModuleStandard.sol";
import { Multisend } from "../../../external/Multisend.sol";
import {
    IGnosisSafe
} from "../../../user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import { Action } from "../../interfaces/IGelatoCore.sol";

contract SelfProviderModuleGnosisSafeProxy is GelatoProviderModuleStandard {
    address public constant MULTI_SEND = 0x29CAa04Fa05A046a05C85A50e8f2af8cf9A05BaC;

    // SelfProvider only needs to provide execPayload. isProvided() handled by Standard.
    function execPayload(Action[] calldata _actions)
        external
        view
        override
        returns(bytes memory)
    {
        if( _actions.length == 1) {
            return abi.encodeWithSelector(
                IGnosisSafe.execTransactionFromModuleReturnData.selector,
                _actions[0].inst,  // to
                _actions[0].value,  // value
                _actions[0].data,
                _actions[0].operation
            );
        } else if (_actions.length > 1) {
            // Action.Operation encoded into multiSendPayload and handled by Multisend
            bytes memory multiSendPayload;

            for (uint i; i < _actions.length; i++ ) {
                bytes memory payloadPart = abi.encodePacked(
                    _actions[i].operation,
                    _actions[i].inst,  // to
                    _actions[i].value,  // value
                    _actions[i].data.length,
                    _actions[i].data
                );
                multiSendPayload = abi.encodePacked(multiSendPayload, payloadPart);
            }

            multiSendPayload = abi.encodeWithSelector(
                Multisend.multiSend.selector,
                multiSendPayload
            );

            return abi.encodeWithSelector(
                IGnosisSafe.execTransactionFromModuleReturnData.selector,
                MULTI_SEND,  // to
                0,  // value
                multiSendPayload,  // data
                IGnosisSafe.Operation.DelegateCall
            );
        } else {
            revert("SelfProviderGnosisSafeProxy.execPayload: 0 _actions length");
        }
    }
}