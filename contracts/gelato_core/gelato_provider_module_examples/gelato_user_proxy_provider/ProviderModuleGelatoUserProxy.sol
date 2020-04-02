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
    mapping(address => uint256) public override actionGasPriceCeil;

    constructor(bytes32[] memory hashes, ActionWithGasPriceCeil[] memory _actions)
        public
    {
        batchProvide(hashes, _actions);
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
            return "ProviderModuleGelatoUserProxy.isProvided:gelatoGasPriceTooHigh";
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
        ActionWithGasPriceCeil[] memory _actions
    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) provideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _actions.length; i++) setActionGasPriceCeil(_actions[i]);
    }

    function batchUnprovide(bytes32[] calldata _hashes, address[] calldata _actions)
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _hashes.length; i++) unprovideProxyExtcodehash(_hashes[i]);
        for (uint256 i = 0; i < _actions.length; i++) {
            ActionWithGasPriceCeil memory action = ActionWithGasPriceCeil({
                _address: _actions[i],
                gasPriceCeil: 0
            });
            setActionGasPriceCeil(action);
        }
    }
}