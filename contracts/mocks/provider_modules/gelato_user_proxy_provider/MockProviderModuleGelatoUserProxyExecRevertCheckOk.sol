// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {
    MockProviderModuleGelatoUserProxyExecRevertCheckRevert
} from "./MockProviderModuleGelatoUserProxyExecRevertCheckRevert.sol";
import {Action} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract MockProviderModuleGelatoUserProxyExecRevertCheckOk is
    MockProviderModuleGelatoUserProxyExecRevertCheckRevert
{
    function execRevertCheck(bytes memory)
        public
        pure
        virtual
        override
    {
        // do nothing
    }
}