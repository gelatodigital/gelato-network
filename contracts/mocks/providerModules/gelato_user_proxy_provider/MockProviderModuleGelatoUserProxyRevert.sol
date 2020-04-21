pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoProviderModuleStandard } from "../../../gelato_core/GelatoProviderModuleStandard.sol";
import { IMockProviderModuleGelatoUserProxy } from "./IMockProviderModuleGelatoUserProxy.sol";
import { Ownable } from "../../../external/Ownable.sol";
import { Action, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/interfaces/IGelatoUserProxy.sol";

contract MockProviderModuleGelatoUserProxyRevert is
    GelatoProviderModuleStandard,
    IMockProviderModuleGelatoUserProxy,
    Ownable
{
    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(ExecClaim calldata)
        external
        view
        override
        returns(string memory)
    {
        return OK;
    }

    // Incorrect execPayload func on purpose
    function execPayload(Action[] calldata _actions)
        external
        pure
        override
        returns(bytes memory)
    {
        revert("Test Revert");
    }

    // GnosisSafeProxy
    function provideProxyExtcodehashes(bytes32[] memory _hashes) public override onlyOwner {
        for (uint i; i < _hashes.length; i++) {
            require(
                !isProxyExtcodehashProvided[_hashes[i]],
                "ProviderModuleGelatoUserProxy.provideProxyExtcodehashes: redundant"
            );
            isProxyExtcodehashProvided[_hashes[i]] = true;
            emit LogProvideProxyExtcodehash(_hashes[i]);
        }
    }

    function unprovideProxyExtcodehashes(bytes32[] memory _hashes) public override onlyOwner {
        for (uint i; i < _hashes.length; i++) {
            require(
                isProxyExtcodehashProvided[_hashes[i]],
                "ProviderModuleGelatoUserProxy.unprovideProxyExtcodehashes: redundant"
            );
            delete isProxyExtcodehashProvided[_hashes[i]];
            emit LogUnprovideProxyExtcodehash(_hashes[i]);
        }
    }
}