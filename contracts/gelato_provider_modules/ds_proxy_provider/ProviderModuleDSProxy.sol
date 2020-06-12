// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoProviderModuleStandard} from "../GelatoProviderModuleStandard.sol";
import {Task} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {
    DSProxyFactory
} from "../../user_proxies/ds_proxy/Proxy.sol";
import {
    IDSProxy
} from "../../user_proxies/ds_proxy/interfaces/IProxy.sol";
import {DSAuthority} from "../../user_proxies/ds_proxy/Auth.sol";
import {GelatoActionPipeline} from "../../gelato_actions/GelatoActionPipeline.sol";

contract ProviderModuleDSProxy is GelatoProviderModuleStandard {

    address public immutable dsProxyFactory;
    address public immutable gelatoCore;
    GelatoActionPipeline public immutable gelatoActionPipeline;

    constructor(
        address _dsProxyFactory,
        address _gelatoCore,
        GelatoActionPipeline _gelatActionPipeline
    )
        public
    {
        dsProxyFactory = _dsProxyFactory;
        gelatoCore = _gelatoCore;
        gelatoActionPipeline = _gelatActionPipeline;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(address _userProxy, address, Task calldata)
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
    function execPayload(uint256, address, address, Task calldata _task, uint256)
        external
        view
        override
        returns(bytes memory payload, bool)
    {
        // Action.Operation encoded into gelatoActionPipelinePayload and handled by GelatoActionPipeline
        bytes memory gelatoActionPipelinePayload = abi.encodeWithSelector(
            GelatoActionPipeline.execActionsAndPipeData.selector,
            _task.actions
        );

        // Delegate call by default
        payload = abi.encodeWithSignature(
            "execute(address,bytes)",
            gelatoActionPipeline,  // to
            gelatoActionPipelinePayload  // data
        );

    }
}