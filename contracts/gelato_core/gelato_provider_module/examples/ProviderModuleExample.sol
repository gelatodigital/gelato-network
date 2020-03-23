pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "../../interfaces/IGelatoProviderModule.sol";
import { IProviderModuleExample } from "./IProviderModuleExample.sol";
import { Ownable } from "../../../external/Ownable.sol";
import { IGnosisSafe } from "../../gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import { IGnosisSafeProxy } from "../../gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafeProxy.sol";
import { ExecClaim } from "../../interfaces/IGelatoCore.sol";
import { Address } from "../../../external/Address.sol";

contract ProviderGnosisSafeProxyModule is
    IGelatoProviderModule,
    IProviderModuleExample,
    Ownable
{
    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;
    mapping(address => bool) public override isMastercopyProvided;
    mapping(address => bool) public override isConditionProvided;
    mapping(address => bool) public override isActionProvided;

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function exec(address _userProxy, address _action, bytes calldata _actionPayload)
        external
        override
    {
        try IGnosisSafe(_userProxy).execTransactionFromModuleReturnData(
            _action,  // to
            0,  // value
            _actionPayload,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool actionExecuted, bytes memory actionRevertReason) {
            if (!actionExecuted) {
                // FAILURE
                // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
                if (actionRevertReason.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := mload(add(0x20, actionRevertReason)) }
                    if (selector == 0x08c379a0) {  // Function selector for Error(string)
                        assembly { actionRevertReason := add(actionRevertReason, 68) }
                        revert(
                            abi.encodePacked(
                                "ProviderGnosisSafeProxyModule:",
                                string(actionRevertReason)
                            )
                        );
                    } else {
                        revert("ProviderGnosisSafeProxyModule:NoErrorSelector");
                    }
                } else {
                    revert("ProviderGnosisSafeProxyModule:UnexpectedReturndata");
                }
            }
        } catch Error(string memory gnosisSafeProxyRevertReason) {
            revert(
                abi.encodePacked(
                    "ProviderGnosisSafeProxyModule:",
                    gnosisSafeProxyRevertReason
                )
            );
        } catch {
            revert("ProviderGnosisSafeProxyModule:UndefinedGnosisSafeProxyError");
        }
    }

    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(ExecClaim memory _execClaim)
        public
        view
        override
        returns (string memory)
    {
        address userProxy = _execClaim.user;
        if (!Address.isContract(userProxy)) return "InvalidUserProxy";
        bytes32 codehash;
        assembly { codehash := extcodehash(userProxy) }
        if (!isProxyExtcodehashProvided[codehash]) return "InvalidGSPCodehash";
        address mastercopy = IGnosisSafeProxy(userProxy).masterCopy();
        if (!isMastercopyProvided[mastercopy]) return "InvalidGSPMastercopy";
        if (!isConditionProvided[_execClaim.action]) return "ConditionNotProvided";
        if (!isActionProvided[_execClaim.action]) return "ActionNotProvided";
        return "Ok";
    }

    // GnosisSafeProxy
    function provideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            !isProxyExtcodehashProvided[_hash],
            "ProviderGnosisSafeProxyModule.provideExtcodehash: already provided"
        );
        isProxyExtcodehashProvided[_hash] = true;
        emit LogProvideProxyExtcodehash(_hash);
    }

    function unprovideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            isProxyExtcodehashProvided[_hash],
            "ProviderGnosisSafeProxyModule.unprovideProxyExtcodehash: already not provided"
        );
        isProxyExtcodehashProvided[_hash] = false;
        emit LogUnprovideProxyExtcodehash(_hash);
    }

    function provideMastercopy(address _mastercopy) public override onlyOwner {
        require(
            !isMastercopyProvided[_mastercopy],
            "ProviderGnosisSafeProxyModule.provideMastercopy: already provided"
        );
        isMastercopyProvided[_mastercopy] = true;
        emit LogProvideMastercopy(_mastercopy);
    }

    function unprovideMastercopy(address _mastercopy) public override onlyOwner {
        require(
            isMastercopyProvided[_mastercopy],
            "ProviderGnosisSafeProxyModule.unprovideMastercopy: already not provided"
        );
        isMastercopyProvided[_mastercopy] = false;
        emit LogUnprovideMastercopy(_mastercopy);
    }

    // (Un-)provide Conditions
    function provideCondition(address _condition) public override onlyOwner {
        require(
            !isConditionProvided[_condition],
            "ProviderGnosisSafeProxyModule.provideCondition: already provided"
        );
        isConditionProvided[_condition] = true;
        emit LogProvideCondition(_condition);
    }

    function unprovideCondition(address _condition) public override onlyOwner {
        require(
            isConditionProvided[_condition],
            "ProviderGnosisSafeProxyModule.unprovideCondition: already not provided"
        );
        isConditionProvided[_condition] = false;
        emit LogUnprovideCondition(_condition);
    }

    // (Un-)provide Actions
    function provideAction(address _action) public override onlyOwner {
        require(
            !isActionProvided[_action],
            "ProviderGnosisSafeProxyModule.provideAction: already provided"
        );
        isActionProvided[_action] = true;
        emit LogProvideAction(_action);
    }

    function unprovideAction(address _action) public override onlyOwner {
        require(
            isActionProvided[_action],
            "ProviderGnosisSafeProxyModule.unprovideAction: already not provided"
        );
        isActionProvided[_action] = false;
        emit LogUnprovideAction(_action);
    }

    // Batch (un-)provide
    function batchProvide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies,
        address[] calldata _conditions,
        address[] calldata _actions
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) provideMastercopy(_mastercopies[i]);
        for (uint256 i = 0; i < _conditions.length; i++) provideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) provideAction(_actions[i]);
    }

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies,
        address[] calldata _conditions,
        address[] calldata _actions
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) unprovideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) unprovideMastercopy(_mastercopies[i]);
        for (uint256 i = 0; i < _conditions.length; i++) unprovideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) unprovideAction(_actions[i]);
    }
}