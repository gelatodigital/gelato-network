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

    modifier providedCondition(address _provider, address _condition) {
        require(
            isProvidedCondition[_provider][_condition],
            "ProviderWhitelistModule.providedCondition"
        );
        _;
    }

    modifier providedAction(address _provider, address _action) {
        require(
            isProvidedAction[_provider][_action],
            "ProviderWhitelistModule.providedAction"
        );
        _;
    }

    modifier liquidProvider(address _provider, uint256 _gasPrice, uint256 _gas) {
        require(
            isProviderLiquid(_provider, _gasPrice, _gas),
            "ProviderWhitelistModule.liquidProvider"
        );
        _;
    }

    // Provide Conditions
    function provideCondition(address _condition) external override {
        require(
            !isProvidedCondition[msg.sender][_condition],
            "ProviderWhitelistModule.unprovideCondition: already provided"
        );
        isProvidedCondition[msg.sender][_condition] = true;
        emit LogProvideCondition(msg.sender, _condition);
    }

    function unprovideCondition(address _condition) external override {
        require(
            isProvidedCondition[msg.sender][_condition],
            "ProviderWhitelistModule.unprovideCondition: already not provided"
        );
        isProvidedCondition[msg.sender][_condition] = false;
        emit LogUnprovideCondition(msg.sender, _condition);
    }

    // Provide Actions
    function provideAction(address _action) external override {
        require(
            !isProvidedAction[msg.sender][_action],
            "ProviderWhitelistModule.provideAction: already provided"
        );
        isProvidedAction[msg.sender][_action] = true;
        emit LogProvideAction(msg.sender, _action);
    }

    function unprovideAction(address _action) external override {
        require(
            isProvidedCondition[msg.sender][_action],
            "ProviderWhitelistModule.unprovideAction: already not provided"
        );
        isProvidedAction[msg.sender][_action] = false;
        emit LogUnprovideAction(msg.sender, _action);
    }

    // Provider Funding
    function provideFunds() public payable override {
        require(msg.value > 0, "GelatoProvider.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[msg.sender].add(msg.value);
        emit LogProvideFunds(msg.sender, providerFunds[msg.sender], newProviderFunds);
        providerFunds[msg.sender] = newProviderFunds;
    }

    function unprovideFunds(uint256 _withdrawAmount)
        external
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
        external
        view
        override
        returns(bool)
    {
        if (_gasDemand > 6000000) return false;
        if (_gasDemand == 0) _gasDemand = 6000000;
        uint256 fundsDemand = _gasDemand.mul(_gasPrice);
        return  fundsDemand <= providerFunds[_provider] ? true : false;
    }
}