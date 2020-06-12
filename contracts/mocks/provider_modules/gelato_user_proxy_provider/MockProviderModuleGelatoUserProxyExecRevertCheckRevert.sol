// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "../../../gelato_provider_modules/GelatoProviderModuleStandard.sol";
import {Task} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract MockProviderModuleGelatoUserProxyExecRevertCheckRevert is
    GelatoProviderModuleStandard
{
    // Incorrect execPayload func on purpose
    function execPayload(uint256, address, address, Task calldata _task, uint256)
        external
        view
        virtual
        override
        returns(bytes memory payload, bool execRevertCheck)
    {
        if (_task.actions.length > 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.multiExecActions.selector,
                _task.actions
            );
        } else if (_task.actions.length == 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                _task.actions[0]
            );
        } else {
            revert("ProviderModuleGelatoUserProxy.execPayload: 0 _actions length");
        }
        execRevertCheck = true;
    }

    function execRevertCheck(bytes memory)
        public
        pure
        virtual
        override
    {
        revert("MockProviderModuleGelatoUserProxyExecRevertCheck.execRevertCheck");
    }
}