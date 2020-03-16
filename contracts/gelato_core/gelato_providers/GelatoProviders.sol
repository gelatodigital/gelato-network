pragma solidity ^0.6.4;

import { IGelatoProviders } from "../interfaces/IGelatoProviders.sol";
import { Address } from "../../external/Address.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { IGelatoProviderModule } from "./provider_module/IGelatoProviderModule.sol";

/// @title GelatoProviders
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProviders is IGelatoProviders {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    mapping(address => bool) public override isRegisteredProvider;
    mapping(address => uint256) public override providerFunds;
    mapping(address => IGelatoProviderModule) public override providerModule;

    // Registration
    function registerProvider(IGelatoProviderModule _module) external payable override {
        require(
            !isRegisteredProvider[msg.sender],
            "GelatoProviders.registerProvider: already registered"
        );
        provideFunds(msg.sender);
        setProviderModule(_module);
        isRegisteredProvider[msg.sender] = true;
        emit LogRegisterProvider(msg.sender);
    }

    function unregisterProvider() external override {
        _requireRegisteredProvider(msg.sender);
        isRegisteredProvider[msg.sender] = false;
        unprovideFunds(providerFunds[msg.sender]);
        providerModule[msg.sender] = IGelatoProviderModule(0);
        emit LogUnregisterProvider(msg.sender);
    }

    // Provider Funding
    function provideFunds(address _provider) public payable override {
        require(msg.value > 0, "GelatoProviders.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[_provider].add(msg.value);
        emit LogProvideFunds(_provider, providerFunds[_provider], newProviderFunds);
        providerFunds[_provider] = newProviderFunds;
    }

    function unprovideFunds(uint256 _withdrawAmount) public override {
        require(_withdrawAmount > 0, "GelatoProviders.unprovideFunds: zero _amount");
        // Checks
        uint256 previousProviderFunding = providerFunds[msg.sender];
        require(
            previousProviderFunding >= _withdrawAmount,
            "GelatoProviders.unprovideFunds: out of funds"
        );
        uint256 newProviderFunding = previousProviderFunding - _withdrawAmount;
        // Effects
        providerFunds[msg.sender] = newProviderFunding;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogUnprovideFunds(msg.sender, previousProviderFunding, newProviderFunding);
    }


    // Provider Whitelist
    function setProviderModule(IGelatoProviderModule _module) public override {
        require(
            _module != IGelatoProviderModule(0),
            "GelatoProviders.setProviderModule: no _module provided"
        );
        emit LogSetProviderWhitelist(providerModule[msg.sender], _module);
        providerModule[msg.sender] = _module;
    }

    function isProvided(
        address _provider,
        address _userProxy,
        address _condition,
        address _action
    )
        public
        view
        override
        returns(bool)  // userProxy
    {
        _requireRegisteredProvider(_provider);
        IGelatoProviderModule module = IGelatoProviderModule(providerModule[_provider]);
        return module.isProvided(_userProxy, _condition, _action);
    }

    // Internal Helpers
    function _requireRegisteredProvider(address _provider) internal view {
        require(
            isRegisteredProvider[_provider],
            "GelatoProviders._isRegisteredProvider"
        );
    }
}