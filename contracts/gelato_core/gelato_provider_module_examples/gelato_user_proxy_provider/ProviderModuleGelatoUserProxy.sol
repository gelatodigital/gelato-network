pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../../GelatoProviderModuleStandard.sol";
import { Action, TaskReceipt } from "../../interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxyFactory
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxyFactory.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract ProviderModuleGelatoUserProxy is GelatoProviderModuleStandard {
    address public immutable gelatoUserProxyFactory;

    constructor(address _gelatoUserProxyFactory) public {
        gelatoUserProxyFactory = _gelatoUserProxyFactory;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(TaskReceipt calldata _TR)
        external
        view
        override
        returns(string memory)
    {
        bool proxyOk = IGelatoUserProxyFactory(gelatoUserProxyFactory).isGelatoUserProxy(
            _TR.userProxy
        );
        if (!proxyOk) return "ProviderModuleGelatoUserProxy.isProvided:InvalidUserProxy";
        return OK;
    }

    function execPayload(Action[] calldata _actions)
        external
        pure
        override
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
            revert("ProviderModuleGelatoUserProxy.execPayload: 0 _actions length");
        }
    }
}