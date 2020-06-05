// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../GelatoProviderModuleStandard.sol";
import { Action, Operation, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxyFactory
} from "../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxyFactory.sol";
import {
    IGelatoUserProxy
} from "../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";
import { GelatoMultiSend } from "../../gelato_helpers/GelatoMultiSend.sol";

contract ProviderModuleGelatoUserProxy is GelatoProviderModuleStandard {

    address public immutable gelatoUserProxyFactory;
    address public immutable gelatoMultiSend;

    constructor(address _gelatoUserProxyFactory, address _gelatoMultiSend) public {
        gelatoUserProxyFactory = _gelatoUserProxyFactory;
        gelatoMultiSend = _gelatoMultiSend;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(uint256, address _userProxy, address, Task calldata)
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

    function execPayload(uint256, address, address, Task calldata _task)
        external
        view
        override
        returns(bytes memory payload, bool)  // bool==false: no execRevertCheck
    {
        if (_task.actions.length > 1) {
            bytes memory gelatoMultiSendPayload = abi.encodeWithSelector(
                GelatoMultiSend.multiSend.selector,
                _task.actions
            );
            Action memory multiSendAction = Action({
                addr: gelatoMultiSend,  // to
                data: gelatoMultiSendPayload,
                operation: Operation.Delegatecall,
                value: 0,
                termsOkCheck: false
            });
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                multiSendAction
            );
        } else if (_task.actions.length == 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                _task.actions[0]
            );
        } else {
            revert("ProviderModuleGelatoUserProxy.execPayload: 0 _task.actions length");
        }
    }
}