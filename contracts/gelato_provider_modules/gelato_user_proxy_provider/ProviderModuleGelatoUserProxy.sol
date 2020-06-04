// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../GelatoProviderModuleStandard.sol";
import { Action, Task, Operation } from "../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxyFactory
} from "../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxyFactory.sol";
import {
    IGelatoUserProxy
} from "../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";
import { GelatoMultiSend } from "../../gelato_helpers/GelatoMultiSend.sol";

contract ProviderModuleGelatoUserProxy is GelatoProviderModuleStandard, GelatoMultiSend {
    address public immutable gelatoUserProxyFactory;

    constructor(address _gelatoUserProxyFactory) public {
        gelatoUserProxyFactory = _gelatoUserProxyFactory;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(address _userProxy, Task calldata)
        external
        view
        override
        returns(string memory)
    {
        bool proxyOk = IGelatoUserProxyFactory(gelatoUserProxyFactory).isGelatoUserProxy(
            _userProxy
        );
        if (!proxyOk) return "ProviderModuleGelatoUserProxy.isProvided:InvalidUserProxy";
        return OK;
    }

    function execPayload(Action[] calldata _actions)
        external
        view
        override
        returns(bytes memory payload, bool)  // bool==false: no execRevertCheck
    {
        if (_actions.length > 1) {
            bytes memory gelatoMultiSendPayload = abi.encodeWithSelector(
                GelatoMultiSend.multiSend.selector,
                _actions
            );
            Action memory multiSendAction = Action({
                addr: address(this),  // to
                data: gelatoMultiSendPayload,
                operation: Operation.Delegatecall,
                value: 0,
                termsOkCheck: false
            });
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                multiSendAction
            );
        } else if (_actions.length == 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                _actions[0]
            );
        } else {
            revert("ProviderModuleGelatoUserProxy.execPayload: 0 _actions length");
        }
    }
}