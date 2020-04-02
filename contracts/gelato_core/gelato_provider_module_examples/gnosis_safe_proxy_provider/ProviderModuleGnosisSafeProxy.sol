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
    mapping(address => uint256) public override actionGasPriceCeil;

    constructor(
        bytes32[] memory hashes,
        address[] memory masterCopies,
        ActionWithGasPriceCeil[] memory _actions
    )
        public
    {
        batchProvide(hashes, masterCopies, _actions);
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(ExecClaim calldata _execClaim, uint256 _gelatoGasPrice)
        external
        view
        override
        returns (string memory)
    {
        if (actionGasPriceCeil[_execClaim.action] < _gelatoGasPrice)
            return "ProviderModuleGnosisSafeProxy.isProvided:gelatoGasPriceTooHigh";
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

    // Action Gas Price Ceils
    function setActionGasPriceCeil(ActionWithGasPriceCeil memory _action)
        public
        override
        onlyOwner
    {
        require(
            actionGasPriceCeil[_action._address] != _action.gasPriceCeil,
            "ProviderModuleGelatoUserProxy.setActionGasPriceCeil: already set"
        );
        emit LogSetActionGasPriceCeil(
            _action._address,
            actionGasPriceCeil[_action._address],
            _action.gasPriceCeil
        );
        if (_action.gasPriceCeil == 0) delete actionGasPriceCeil[_action._address];
        else actionGasPriceCeil[_action._address] = _action.gasPriceCeil;
    }

    // Batch (un-)provide
    function batchProvide(
        bytes32[] memory _hashes,
        address[] memory _mastercopies,
        ActionWithGasPriceCeil[] memory _actions
    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) provideMastercopy(_mastercopies[i]);
        for (uint256 i = 0; i < _actions.length; i++) setActionGasPriceCeil(_actions[i]);
    }

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies,
        address[] calldata _actions
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) unprovideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) unprovideMastercopy(_mastercopies[i]);
        for (uint256 i = 0; i < _actions.length; i++) {
            ActionWithGasPriceCeil memory action = ActionWithGasPriceCeil({
                _address: _actions[i],
                gasPriceCeil: 0
            });
            setActionGasPriceCeil(action);
        }
    }
}