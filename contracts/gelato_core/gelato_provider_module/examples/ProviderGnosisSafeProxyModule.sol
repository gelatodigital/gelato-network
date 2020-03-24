pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "../../interfaces/IGelatoProviderModule.sol";
import { IProviderGnosisSafeProxyModule } from "./IProviderGnosisSafeProxyModule.sol";
import { Ownable } from "../../../external/Ownable.sol";
import { IGnosisSafe } from "../../../gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import { IGnosisSafeProxy } from "../../../gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafeProxy.sol";
import { ExecClaim } from "../../interfaces/IGelatoCore.sol";
import { Address } from "../../../external/Address.sol";


contract ProviderGnosisSafeProxyModule is
    IGelatoProviderModule,
    IProviderGnosisSafeProxyModule,
    Ownable
{
    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;
    mapping(address => bool) public override isMastercopyProvided;
    mapping(address => bool) public override isConditionProvided;
    mapping(address => bool) public override isActionProvided;
    mapping(address => uint256) public override actionGasPriceCeil;

    // ================= GELATO PROVIDER MODULE STANDARD ================
    // @dev since we check extcodehash prior to execution, we forego the execution option
    //  where the userProxy is deployed at execution time.
    function isProvided(ExecClaim memory _execClaim, address, uint256 _gelatoGasPrice)
        public
        view
        override
        returns (string memory)
    {
        if (actionGasPriceCeil[_execClaim.action] < _gelatoGasPrice)
            return "ProviderGnosisSafeProxyModule.isProvided:gelatoGasPriceTooHigh";
        if (!isConditionProvided[_execClaim.condition])
            return "ProviderGnosisSafeProxyModule.isProvided:ConditionNotProvided";
        address userProxy = _execClaim.user;
        if (!Address.isContract(userProxy))
            return "ProviderGnosisSafeProxyModule.isProvided:InvalidUserProxy";
        bytes32 codehash;
        assembly { codehash := extcodehash(userProxy) }
        if (!isProxyExtcodehashProvided[codehash])
            return "ProviderGnosisSafeProxyModule.isProvided:InvalidGSPCodehash";
        address mastercopy = IGnosisSafeProxy(userProxy).masterCopy();
        if (!isMastercopyProvided[mastercopy])
            return "ProviderGnosisSafeProxyModule.isProvided:InvalidGSPMastercopy";
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
        delete isProxyExtcodehashProvided[_hash];
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
        delete isMastercopyProvided[_mastercopy];
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
        delete isConditionProvided[_condition];
        emit LogUnprovideCondition(_condition);
    }

    // (Un-)provide Actions at different gasPrices
    function provideAction(ActionWithGasPriceCeil memory _action) public override onlyOwner {
        setActionGasPriceCeil(_action);
        isActionProvided[_action._address] = true;
        emit LogProvideAction(_action._address);
    }

    function unprovideAction(address _action) public override onlyOwner {
        require(
            actionGasPriceCeil[_action] != 0,
            "ProviderGnosisSafeProxyModule.unprovideAction: already not provided"
        );
        delete isActionProvided[_action];
        delete actionGasPriceCeil[_action];
        emit LogUnprovideAction(_action);
    }

    function setActionGasPriceCeil(ActionWithGasPriceCeil memory _action)
        public
        override
        onlyOwner
    {
        require(
            actionGasPriceCeil[_action._address] != _action.gasPriceCeil &&
            actionGasPriceCeil[_action._address] != 0,
            "ProviderGnosisSafeProxyModule.setActionGasPriceCeil: duplicate or 0"
        );
        emit LogSetActionGasPriceCeil(
            _action._address,
            actionGasPriceCeil[_action._address],
            _action.gasPriceCeil
        );
        actionGasPriceCeil[_action._address] = _action.gasPriceCeil;
    }

    // Batch (un-)provide
    function batchProvide(
        bytes32[] memory _hashes,
        address[] memory _mastercopies,
        address[] memory _conditions,
        ActionWithGasPriceCeil[] memory _actions
    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _mastercopies.length; i++) provideMastercopy(_mastercopies[i]);
        for (uint256 i = 0; i < _conditions.length; i++) provideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) setActionGasPriceCeil(_actions[i]);
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