pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "../../interfaces/IGelatoProviderModule.sol";
import { IProviderModuleGelatoUserProxy } from "./IProviderModuleGelatoUserProxy.sol";
import { Ownable } from "../../../external/Ownable.sol";
import {
    IGelatoUserProxyFactory
} from "../../../user_proxies/gelato_user_proxy/IGelatoUserProxyFactory.sol";
import { ExecClaim } from "../../interfaces/IGelatoCore.sol";
import { Address } from "../../../external/Address.sol";
import {
    IGelatoUserProxy
} from "../../../user_proxies/gelato_user_proxy/IGelatoUserProxy.sol";

contract ProviderModuleGelatoUserProxy is
    IGelatoProviderModule,
    IProviderModuleGelatoUserProxy,
    Ownable
{
    mapping(bytes32 => bool) public override isProxyExtcodehashProvided;
    mapping(address => bool) public override isConditionProvided;
    mapping(address => bool) public override isActionProvided;
    mapping(address => uint256) public override actionGasPriceCeil;

    constructor(
        bytes32[] memory hashes,
        address[] memory _conditions,
        ActionWithGasPriceCeil[] memory _actions
    )
        public
    {
        batchProvide(hashes, _conditions, _actions);
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
            return "ProviderModuleGelatoUserProxy.isProvided:InvalidExtcodehash";

        return "Ok";
    }

    function execPayload(address _action, bytes calldata _actionPayload)
        external
        pure
        override
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            IGelatoUserProxy.delegatecallGelatoAction.selector,
            _action,
            _actionPayload
        );
    }

    // GnosisSafeProxy
    function provideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            !isProxyExtcodehashProvided[_hash],
            "ProviderModuleGelatoUserProxy.provideExtcodehash: already provided"
        );
        isProxyExtcodehashProvided[_hash] = true;
        emit LogProvideProxyExtcodehash(_hash);
    }

    function unprovideProxyExtcodehash(bytes32 _hash) public override onlyOwner {
        require(
            isProxyExtcodehashProvided[_hash],
            "ProviderModuleGelatoUserProxy.unprovideProxyExtcodehash: already not provided"
        );
        delete isProxyExtcodehashProvided[_hash];
        emit LogUnprovideProxyExtcodehash(_hash);
    }

    // (Un-)provide Conditions
    function provideCondition(address _condition) public override onlyOwner {
        require(
            !isConditionProvided[_condition],
            "ProviderModuleGelatoUserProxy.provideCondition: already provided"
        );
        isConditionProvided[_condition] = true;
        emit LogProvideCondition(_condition);
    }

    function unprovideCondition(address _condition) public override onlyOwner {
        require(
            isConditionProvided[_condition],
            "ProviderModuleGelatoUserProxy.unprovideCondition: already not provided"
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
            "ProviderModuleGelatoUserProxy.unprovideAction: already not provided"
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
            _action.gasPriceCeil != 0,
            "ProviderModuleGelatoUserProxy.setActionGasPriceCeil: duplicate or 0"
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
        address[] memory _conditions,
        ActionWithGasPriceCeil[] memory _actions
    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _conditions.length; i++) provideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) setActionGasPriceCeil(_actions[i]);
    }

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _conditions,
        address[] calldata _actions
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) unprovideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _conditions.length; i++) unprovideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) unprovideAction(_actions[i]);
    }
}