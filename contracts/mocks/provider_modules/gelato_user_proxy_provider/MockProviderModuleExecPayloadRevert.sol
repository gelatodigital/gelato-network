// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "../../../gelato_provider_modules/GelatoProviderModuleStandard.sol";
import { Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract MockProviderModuleExecPayloadRevert is GelatoProviderModuleStandard {
    // Incorrect execPayload func on purpose
    function execPayload(uint256, address, address, Task calldata)
        external
        view
        override
        returns(bytes memory, bool)
    {
        revert("MockProviderModuleExecPayloadRevert.execPayload: test revert");
    }
}