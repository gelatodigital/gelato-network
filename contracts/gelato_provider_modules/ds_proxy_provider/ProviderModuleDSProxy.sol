// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../GelatoProviderModuleStandard.sol";
import { Action, Task, Operation } from "../../gelato_core/interfaces/IGelatoCore.sol";
import {
    DSProxyFactory
} from "../../user_proxies/ds_proxy/Proxy.sol";
import {
    IDSProxy
} from "../../user_proxies/ds_proxy/interfaces/IProxy.sol";
import { DSAuthority } from "../../user_proxies/ds_proxy/Auth.sol";

import { Multisend } from "../../external/Multisend.sol";
import { GelatoMultiSend } from "../../gelato_helpers/GelatoMultiSend.sol";

contract ProviderModuleDSProxy is GelatoProviderModuleStandard {

    address public immutable dsProxyFactory;
    address public immutable gelatoCore;
    GelatoMultiSend public immutable gelatoMultiSend;

    constructor(
        address _dsProxyFactory,
        address _gelatoCore,
        GelatoMultiSend _multiSend
    )
        public
    {
        dsProxyFactory = _dsProxyFactory;
        gelatoCore = _gelatoCore;
        gelatoMultiSend = _multiSend;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(address _userProxy, Task calldata)
        external
        view
        override
        returns(string memory)
    {

        // Was proxy deployed from correct factory?
        bool proxyOk = DSProxyFactory(dsProxyFactory).isProxy(
            _userProxy
        );
        if (!proxyOk) return "ProviderModuleGelatoUserProxy.isProvided:InvalidUserProxy";

        // Is gelato core whitelisted?
        DSAuthority authority = IDSProxy(_userProxy).authority();
        bool isGelatoWhitelisted = authority.canCall(gelatoCore, _userProxy, IDSProxy(_userProxy).execute.selector);
        if (!isGelatoWhitelisted) return "ProviderModuleGelatoUserProxy.isProvided:GelatoCoreNotWhitelisted";

        return OK;
    }

    /// @dev DS PROXY ONLY ALLOWS DELEGATE CALL for single actions, that's why we also use multisend
    function execPayload(Action[] calldata _actions)
        external
        view
        override
        returns(bytes memory payload, bool)
    {
        // Action.Operation encoded into gelatoMultiSendPayload and handled by GelatoMultisend
        bytes memory gelatoMultiSendPayload = abi.encodeWithSelector(
                GelatoMultiSend.multiSend.selector,
                _actions
            );

        // Delegate call by default
        payload = abi.encodeWithSignature(
            "execute(address,bytes)",
            gelatoMultiSend,  // to
            gelatoMultiSendPayload  // data
        );

    }
}