pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../../GelatoProviderModuleStandard.sol";
import { Action } from "../../interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract SelfProviderModuleGelatoUserProxy is GelatoProviderModuleStandard {
    // SelfProvider only needs to provide execPayload. isProvided() handled by Standard.
    function execPayload(Action[] calldata _actions)
        external
        view
        override
        virtual
        returns(bytes memory)
    {
        if (_actions.length > 1) {
            return abi.encodeWithSelector(
                IGelatoUserProxy.multiExecActions.selector,
                _actions
            );
        } else if (_actions.length == 1) {
            return abi.encodeWithSelector(
                IGelatoUserProxy.execAction.selector,
                _actions[0]
            );
        } else {
            revert("SelfProviderGelatoUserProxy.execPayload: 0 _actions length");
        }
    }
}