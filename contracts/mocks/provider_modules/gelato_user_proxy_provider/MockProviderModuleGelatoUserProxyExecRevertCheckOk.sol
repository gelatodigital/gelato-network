// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {
    MockProviderModuleGelatoUserProxyExecRevertCheckRevert
} from "./MockProviderModuleGelatoUserProxyExecRevertCheckRevert.sol";
import { Action } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract MockProviderModuleGelatoUserProxyExecRevertCheckOk is
    MockProviderModuleGelatoUserProxyExecRevertCheckRevert
{
    function execRevertCheck(bytes memory)
        public
        pure
        override
        virtual
    {
        // do nothing
    }
}