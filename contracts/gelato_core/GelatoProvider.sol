pragma solidity ^0.6.2;

import "./interfaces/IGelatoProvider.sol";
import "../external/Address.sol";
import "../external/SafeMath.sol";

/// @title GelatoProvider
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProvider is IGelatoProvider {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    mapping(address => mapping(address => bool)) public override isProvidedCondition;
    mapping(address => mapping(address => bool)) public override isProvidedAction;
    mapping(address => uint256) public override providerFunds;

    // Register as provider
    function registerProvider(address[] calldata _conditions, address[] calldata _actions)
        external
        payable
        override
    {
        for (uint8 i = 0; i < _conditions.length; i++) provideCondition(_conditions[i]);
        for (uint8 i = 0; i < _actions.length; i++) provideAction(_actions[i]);
        provideFunds(msg.sender);
    }

    // Unregister as provider
    function unregisterProvider(address[] calldata _conditions, address[] calldata _actions)
        external
        override
    {
        for (uint8 i = 0; i < _conditions.length; i++) unprovideCondition(_conditions[i]);
        for (uint8 i = 0; i < _actions.length; i++) unprovideAction(_actions[i]);
        unprovideFunds(providerFunds[msg.sender]);
    }

    // Provide Conditions
    function provideCondition(address _condition) public override {
        require(
            !isProvidedCondition[msg.sender][_condition],
            "ProviderWhitelistModule.provideCondition: already provided"
        );
        isProvidedCondition[msg.sender][_condition] = true;
        emit LogProvideCondition(msg.sender, _condition);
    }

    function unprovideCondition(address _condition) public override {
        require(
            isProvidedCondition[msg.sender][_condition],
            "ProviderWhitelistModule.unprovideCondition: already not provided"
        );
        isProvidedCondition[msg.sender][_condition] = false;
        emit LogUnprovideCondition(msg.sender, _condition);
    }

    // Provide Actions
    function provideAction(address _action) public override {
        require(
            !isProvidedAction[msg.sender][_action],
            "ProviderWhitelistModule.provideAction: already provided"
        );
        isProvidedAction[msg.sender][_action] = true;
        emit LogProvideAction(msg.sender, _action);
    }

    function unprovideAction(address _action) public override {
        require(
            isProvidedAction[msg.sender][_action],
            "ProviderWhitelistModule.unprovideAction: already not provided"
        );
        isProvidedAction[msg.sender][_action] = false;
        emit LogUnprovideAction(msg.sender, _action);
    }

    // Provider Funding
    function provideFunds(address _provider) public payable override {
        require(msg.value > 0, "GelatoProvider.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[_provider].add(msg.value);
        emit LogProvideFunds(_provider, providerFunds[_provider], newProviderFunds);
        providerFunds[_provider] = newProviderFunds;
    }

    function unprovideFunds(uint256 _withdrawAmount)
        public
        override
    {
        require(_withdrawAmount > 0, "GelatoProvider.unprovideFunds: zero _amount");
        // Checks
        uint256 previousProviderFunding = providerFunds[msg.sender];
        require(
            previousProviderFunding >= _withdrawAmount,
            "GelatoProvider.unprovideFunds: out of funds"
        );
        uint256 newProviderFunding = previousProviderFunding - _withdrawAmount;
        // Effects
        providerFunds[msg.sender] = newProviderFunding;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogUnprovideFunds(msg.sender, previousProviderFunding, newProviderFunding);
    }

    function isProviderLiquid(address _provider, uint256 _gasPrice, uint256 _gasDemand)
        public
        view
        override
        returns(bool)
    {
        if (_gasDemand > 6000000) return false;
        if (_gasDemand == 0) _gasDemand = 6000000;
        uint256 fundsDemand = _gasDemand.mul(_gasPrice);
        return  fundsDemand <= providerFunds[_provider] ? true : false;
    }

    function _liquidProvider(address _provider, uint256 _gasPrice, uint256 _gas)
        internal
        view
    {
        require(
            isProviderLiquid(_provider, _gasPrice, _gas),
            "ProviderWhitelistModule.liquidProvider"
        );
    }
}