// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "../../../gelato_provider_modules/GelatoProviderModuleStandard.sol";
import { Action } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract MockProviderModuleGelatoUserProxyExecRevertCheckError is
    GelatoProviderModuleStandard
{

    // Incorrect execPayload func on purpose
    function execPayload(Action[] memory _actions)
        public
        view
        override
        virtual
        returns(bytes memory payload, bool execRevertCheck)
    {
        if (_actions.length > 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.multiExecActions.selector,
                _actions
            );
        } else if (_actions.length == 1) {
            payload = abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                _actions[0]
            );
        } else {
            revert("ProviderModuleGelatoUserProxy.execPayload: 0 _actions length");
        }
        execRevertCheck = true;
    }

    function execRevertCheck(bytes memory)
        public
        pure
        override
        virtual
    {
        assert(false);
    }
}