pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../GelatoProviderModuleStandard.sol";
import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";
import {
    DSProxyFactory
} from "../../user_proxies/ds_proxy/Proxy.sol";
import {
    IDSProxy
} from "../../user_proxies/ds_proxy/interfaces/IProxy.sol";
import { DSAuthority } from "../../user_proxies/ds_proxy/Auth.sol";

import { Multisend } from "../../external/Multisend.sol";

contract ProviderModuleDSProxy is GelatoProviderModuleStandard {

    address public immutable dsProxyFactory;
    address public immutable gelatoCore;
    address public immutable multiSend;

    constructor(
        address _dsProxyFactory,address _gelatoCore,
        address _multiSend
    )
        public
    {
        dsProxyFactory = _dsProxyFactory;
        gelatoCore = _gelatoCore;
        multiSend = _multiSend;
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
        // Action.Operation encoded into multiSendPayload and handled by Multisend
        bytes memory multiSendPayload;

        for (uint i; i < _actions.length; i++ ) {
            bytes memory payloadPart = abi.encodePacked(
                _actions[i].operation,
                _actions[i].addr,  // to
                _actions[i].value,
                _actions[i].data.length,
                _actions[i].data
            );
            multiSendPayload = abi.encodePacked(multiSendPayload, payloadPart);
        }

        multiSendPayload = abi.encodeWithSelector(
            Multisend.multiSend.selector,
            multiSendPayload
        );

        // Delegate call by default
        payload = abi.encodeWithSignature(
            "execute(address,bytes)",
            multiSend,  // to
            multiSendPayload  // data
        );

    }
}