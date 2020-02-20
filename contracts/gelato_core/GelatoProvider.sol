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

    // One time tracker of registered providers
    mapping(address => bool) public override isRegisteredProvider;
    // Funds that the provider makes available for any of his condition-action executions
    mapping(address => uint256) public override providerFunding;
    // What the provider must keep on GelatoCore for all their outstanding ExecutionClaims
    mapping(address => uint256) public override lockedProviderFunds;
    // The max GasPrice a provider is willing to pay to executors
    mapping(address => uint256) public override providerGasPriceCeiling;
    //      provider(p) =>     Condition(C) =>    Action(A) => yes/no
    mapping(address => mapping(address => mapping(address => bool))) public override pCA;

    modifier liquidProvider(address _provider) {
        require(isProviderLiquid(_provider), "GelatoProvider.liquidProvider");
        _;
    }

    modifier isPCA(address _provider, address _condition, address _action) {
        require(pCA[_provider][_condition][_action], "GelatoProvider.isPCA: !provided");
        _;
    }

    modifier registeredProvider(address _provider) {
        require(
                isRegisteredProvider[_provider],
                "GelatoProvider.registeredProvider: not registered"
        );
        _;
    }

   modifier minMaxProviderGasPriceCeiling(uint256 _gasPriceCeiling) {
        require(
            _gasPriceCeiling >= 1000000000 &&  // 1 gwei
            _gasPriceCeiling <= 999000000000,  // 999 gwei
            "GelatoProvider.minMaxProviderGasPriceCeiling"
        );
        _;
   }

   // Provider Registration
   function registerProvider(
       address _condition,
       address _action,
       uint256 _gasPriceCeiling
    )
        external
        payable
        minMaxProviderGasPriceCeiling(_gasPriceCeiling)
    {
        isRegisteredProvider[msg.sender] = true;
        provideFunds();
        provideCA(_condition, _action);
        setProviderGasPriceCeiling(_gasPriceCeiling);
        emit LogRegisterProvider(msg.sender);
    }

    // Provider Funding
    function provideFunds() public payable override registeredProvider(msg.sender) {
        require(msg.value > 0, "GelatoProvider.provideFunds: zero value");
        uint256 previousProviderFunding = providerFunding[msg.sender];
        uint256 newProviderFunding = previousProviderFunding.add(msg.value);
        require(
            newProviderFunding >= lockedProviderFunds[msg.sender],
            "GelatoProvider.provideFunds: underfunded lockedProviderFunds"
        );
        emit LogProvideFunds(
            msg.sender,
            previousProviderFunding,
            newProviderFunding,
            lockedProviderFunds[msg.sender]
        );
    }

    function unprovideFunds(uint256 _amount)
        external
        override
        registeredProvider(msg.sender)
    {
        require(_amount > 0, "GelatoProvider.unprovideFunds: zero _amount");
        // Checks
        uint256 previousProviderFunding = providerFunding[msg.sender];
        require(
            previousProviderFunding >= _amount,
            "GelatoProvider.unprovideFunds: out of funds"
        );
        uint256 newProviderFunding = previousProviderFunding - _amount;
        require(
            newProviderFunding >= lockedProviderFunds[msg.sender],
            "GelatoProvider.unprovideFunds: locked funds"
        );
        // Effects
        providerFunding[msg.sender] = newProviderFunding;
        // Interaction
        msg.sender.sendValue(_amount);
        emit LogUnprovideFunds(
            msg.sender,
            previousProviderFunding,
            newProviderFunding,
            lockedProviderFunds[msg.sender]
        );
    }

    // Set Provider's optional gas price tolerance: 0 = default to gelatoGasPrice
    function setProviderGasPriceCeiling(uint256 _gasPriceCeiling)
        public
        override
        registeredProvider(msg.sender)
        minMaxProviderGasPriceCeiling(_gasPriceCeiling)
    {
        emit LogSetProviderGasPriceCeiling(_gasPriceCeiling);
        providerGasPriceCeiling[msg.sender] = _gasPriceCeiling;
    }

    // Checks if provider has unlocked funds worth 7 mio gas * providerGasPriceCeil
    function isProviderLiquid(address _provider) public view override returns(bool) {
        return (
            providerFunding[_provider].sub(
                lockedProviderFunds[_provider],
                "GelatoProvider.liquidProvider: providerFunding < lockedProviderFunds"
            ) > 7000000 * providerGasPriceCeiling[_provider]
        );
    }

    // Provider's Condition Action Pair Whitelist
    function provideCA(address _condition, address _action)
        public
        override
        registeredProvider(msg.sender)
    {
        require(
            !pCA[msg.sender][_condition][_action],
            "GelatoProvider.provideCA: already providing CA."
        );
        pCA[msg.sender][_condition][_action] = true;
        emit LogProvideCA(msg.sender, _condition, _action);
    }

    function unprovideCA(address _condition, address _action)
        external
        override
        registeredProvider(msg.sender)
    {
        require(
            pCA[msg.sender][_condition][_action],
            "GelatoProvider.unprovideCA: already not providing CA."
        );
        pCA[msg.sender][_condition][_action] = false;
        emit LogUnprovideCA(msg.sender, _condition, _action);
    }
}