// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoProviderModuleStandard} from "../GelatoProviderModuleStandard.sol";
import {IProviderModuleGnosisSafeProxy} from "./IProviderModuleGnosisSafeProxy.sol";
import {Ownable} from "../../external/Ownable.sol";
import {GelatoDebug} from "../../libraries/GelatoDebug.sol";
import {GelatoActionPipeline} from "../../gelato_actions/GelatoActionPipeline.sol";
import {
    IGnosisSafe
} from "../../user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import {
    IGnosisSafeProxy
} from "../../user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafeProxy.sol";
import {Task} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract ProviderModuleGnosisSafeProxy is
    GelatoProviderModuleStandard,
    IProviderModuleGnosisSafeProxy,
    Ownable
{
    using GelatoDebug for bytes;

    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;
    mapping(address => bool) public override isMastercopyProvided;
    address public override immutable gelatoCore;
    address public override immutable gelatoActionPipeline;

    constructor(
        bytes32[] memory hashes,
        address[] memory masterCopies,
        address _gelatoCore,
        address _gelatoActionPipeline
    )
        public
    {
        multiProvide(hashes, masterCopies);
        gelatoCore = _gelatoCore;
        gelatoActionPipeline = _gelatoActionPipeline;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(address _userProxy, address, Task calldata)
        external
        view
        override
        returns(string memory)
    {
        bytes32 codehash;
        assembly { codehash := extcodehash(_userProxy) }
        if (!isProxyExtcodehashProvided[codehash])
            return "ProviderModuleGnosisSafeProxy.isProvided:InvalidGSPCodehash";
        address mastercopy = IGnosisSafeProxy(_userProxy).masterCopy();
        if (!isMastercopyProvided[mastercopy])
            return "ProviderModuleGnosisSafeProxy.isProvided:InvalidGSPMastercopy";
        if (!isGelatoCoreWhitelisted(_userProxy))
            return "ProviderModuleGnosisSafeProxy.isProvided:GelatoCoreNotWhitelisted";
        return OK;
    }

    function execPayload(uint256, address, address, Task calldata _task, uint256)
        external
        view
        override
        returns(bytes memory payload, bool proxyReturndataCheck)
    {
        // execTransactionFromModuleReturnData catches reverts so must check for reverts
        proxyReturndataCheck = true;

        if (_task.actions.length == 1) {
            payload = abi.encodeWithSelector(
                IGnosisSafe.execTransactionFromModuleReturnData.selector,
                _task.actions[0].addr,  // to
                _task.actions[0].value,
                _task.actions[0].data,
                _task.actions[0].operation
            );
        } else if (_task.actions.length > 1) {
            // Action.Operation encoded into multiSendPayload and handled by Multisend
            bytes memory gelatoActionPipelinePayload = abi.encodeWithSelector(
                GelatoActionPipeline.execActionsAndPipeData.selector,
                _task.actions
            );

            payload = abi.encodeWithSelector(
                IGnosisSafe.execTransactionFromModuleReturnData.selector,
                gelatoActionPipeline,  // to
                0,  // value
                gelatoActionPipelinePayload,  // data
                IGnosisSafe.Operation.DelegateCall
            );

        } else {
            revert("ProviderModuleGnosisSafeProxy.execPayload: 0 _task.actions length");
        }
    }

    function execRevertCheck(bytes calldata _proxyReturndata)
        external
        pure
        virtual
        override
    {
        (bool success, bytes memory returndata) = abi.decode(_proxyReturndata, (bool,bytes));
        if (!success) returndata.revertWithErrorString(":ProviderModuleGnosisSafeProxy:");
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

    // Batch (un-)provide
    function multiProvide(bytes32[] memory _hashes, address[] memory _mastercopies)
        public
        override
        onlyOwner
    {
        provideProxyExtcodehashes(_hashes);
        provideMastercopies(_mastercopies);
    }

    function multiUnprovide(bytes32[] calldata _hashes, address[] calldata _mastercopies)
        external
        override
        onlyOwner
    {
        unprovideProxyExtcodehashes(_hashes);
        unprovideMastercopies(_mastercopies);
    }

    function isGelatoCoreWhitelisted(address _userProxy)
        view
        internal
        returns(bool)
    {
        address[] memory whitelistedModules = IGnosisSafe(_userProxy).getModules();
        for (uint i = 0; i < whitelistedModules.length; i++)
            if (whitelistedModules[i] == gelatoCore) return true;
        return false;
    }

}