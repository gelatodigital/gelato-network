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
    address public gelatoCore;

    constructor(bytes32[] memory hashes, address[] memory masterCopies, address _gelatoCore) public {
        batchProvide(hashes, masterCopies);
        gelatoCore = _gelatoCore;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(ExecClaim memory _execClaim)
        public
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
        if (!isGelatoCoreWhitelisted(userProxy))
            return "ProviderModuleGnosisSafeProxy.isProvided:GelatoCoreNotWhitelisted";
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
    function provideProxyExtcodehashes(bytes32[] memory _hashes) public override onlyOwner {
        for (uint i; i < _hashes.length; i++) {
            require(
                !isProxyExtcodehashProvided[_hashes[i]],
                "ProviderModuleGnosisSafeProxy.provideProxyExtcodehashes: redundant"
            );
            isProxyExtcodehashProvided[_hashes[i]] = true;
            emit LogProvideProxyExtcodehash(_hashes[i]);
        }
    }

    function unprovideProxyExtcodehashes(bytes32[] memory _hashes) public override onlyOwner {
        for (uint i; i < _hashes.length; i++) {
            require(
                isProxyExtcodehashProvided[_hashes[i]],
                "ProviderModuleGnosisSafeProxy.unprovideProxyExtcodehashes: redundant"
            );
            delete isProxyExtcodehashProvided[_hashes[i]];
            emit LogUnprovideProxyExtcodehash(_hashes[i]);
        }
    }

    function provideMastercopies(address[] memory _mastercopies) public override onlyOwner {
        for (uint i; i < _mastercopies.length; i++) {
            require(
                !isMastercopyProvided[_mastercopies[i]],
                "ProviderModuleGnosisSafeProxy.provideMastercopy: redundant"
            );
            isMastercopyProvided[_mastercopies[i]] = true;
            emit LogProvideMastercopy(_mastercopies[i]);
        }
    }

    function unprovideMastercopies(address[] memory _mastercopies) public override onlyOwner {
        for (uint i; i < _mastercopies.length; i++) {
            require(
                isMastercopyProvided[_mastercopies[i]],
                "ProviderModuleGnosisSafeProxy.unprovideMastercopies: redundant"
            );
            delete isMastercopyProvided[_mastercopies[i]];
            emit LogUnprovideMastercopy(_mastercopies[i]);
        }
    }

    function isGelatoCoreWhitelisted(address _userProxy)
        view
        internal
        returns(bool isWhitelisted)
    {
        address[] memory whitelistedModules =  IGnosisSafe(_userProxy).getModules();
        for(uint i = 0; i < whitelistedModules.length; i++) {
            if (whitelistedModules[i] == address(0x0ACEFf0880F50c618bA9Aa22530BFF14910Aeccf)) {
                isWhitelisted = true;
            }
        }
    }

    // Batch (un-)provide
    function batchProvide(bytes32[] memory _hashes, address[] memory _mastercopies)
        public
        override
        onlyOwner
    {
        provideProxyExtcodehashes(_hashes);
        provideMastercopies(_mastercopies);
    }

    function batchUnprovide(bytes32[] calldata _hashes, address[] calldata _mastercopies)
        external
        override
        onlyOwner
    {
        unprovideProxyExtcodehashes(_hashes);
        unprovideMastercopies(_mastercopies);
    }

    function setGelatoCore(address _gelatoCore)
        external
        onlyOwner
    {
        require(_gelatoCore != address(0), "Gelato Core cannot be address 0");
        gelatoCore = _gelatoCore;
    }

}