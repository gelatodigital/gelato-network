pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "../../interfaces/IGelatoProviderModule.sol";
import { IProviderModuleGnosisSafeProxy } from "./IProviderModuleGnosisSafeProxy.sol";
import { Ownable } from "../../../external/Ownable.sol";
import {
    IGnosisSafe
} from "../../../user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import {
    IGnosisSafeProxy
} from "../../../user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafeProxy.sol";
import { ExecClaim } from "../../interfaces/IGelatoCore.sol";

contract ProviderModuleGnosisSafeProxy is
    IGelatoProviderModule,
    IProviderModuleGnosisSafeProxy,
    Ownable
{
    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;
    mapping(address => bool) public override isMastercopyProvided;

    constructor(
        bytes32[] memory hashes,
        address[] memory masterCopies
    )
        public
    {
        batchProvide(hashes, masterCopies);
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function providerModuleCheck(ExecClaim calldata _execClaim)
        external
        view
        override
        returns (string memory)
    {
        address userProxy = _execClaim.userProxy;
        bytes32 codehash;
        assembly { codehash := extcodehash(userProxy) }
        if (!isProxyExtcodehashProvided[codehash])
            return "ProviderModuleGnosisSafeProxy.isProvided:InvalidGSPCodehash";
        address mastercopy = IGnosisSafeProxy(userProxy).masterCopy();
        if (!isMastercopyProvided[mastercopy])
            return "ProviderModuleGnosisSafeProxy.isProvided:InvalidGSPMastercopy";
        return "Ok";
    }

    function execPayload(address _action, bytes calldata _actionPayload)
        external
        pure
        override
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            IGnosisSafe.execTransactionFromModuleReturnData.selector,
            _action,  // to
            0,  // value
            _actionPayload,  // data
            IGnosisSafe.Operation.DelegateCall
        );
    }

    // GnosisSafeProxy
    function provideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            !isProxyExtcodehashProvided[_hash],
            "ProviderModuleGnosisSafeProxy.provideExtcodehash: already provided"
        );
        isProxyExtcodehashProvided[_hash] = true;
        emit LogProvideProxyExtcodehash(_hash);
    }

    function unprovideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            isProxyExtcodehashProvided[_hash],
            "ProviderModuleGnosisSafeProxy.unprovideProxyExtcodehash: already not provided"
        );
        delete isProxyExtcodehashProvided[_hash];
        emit LogUnprovideProxyExtcodehash(_hash);
    }

    function provideMastercopy(address _mastercopy) public override onlyOwner {
        require(
            !isMastercopyProvided[_mastercopy],
            "ProviderModuleGnosisSafeProxy.provideMastercopy: already provided"
        );
        isMastercopyProvided[_mastercopy] = true;
        emit LogProvideMastercopy(_mastercopy);
    }

    function unprovideMastercopy(address _mastercopy) public override onlyOwner {
        require(
            isMastercopyProvided[_mastercopy],
            "ProviderModuleGnosisSafeProxy.unprovideMastercopy: already not provided"
        );
        delete isMastercopyProvided[_mastercopy];
        emit LogUnprovideMastercopy(_mastercopy);
    }

    // Batch (un-)provide
    function batchProvide(
        bytes32[] memory _hashes,
        address[] memory _mastercopies
    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) provideMastercopy(_mastercopies[i]);
    }

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) unprovideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) unprovideMastercopy(_mastercopies[i]);
    }
}