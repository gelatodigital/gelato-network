pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../../../gelato_core/GelatoProviderModuleStandard.sol";
import { Action } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract MockProviderModuleGelatoUserProxyRevert is GelatoProviderModuleStandard {
    // Incorrect execPayload func on purpose
    function execPayload(Action[] calldata)
        external
        view
        override
        returns(bytes memory, bool)
    {
        revert("MockProviderModuleGelatoUserProxyRevert.execPayload: test revert");
    }
}