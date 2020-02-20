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

    // Funds that the provider makes available for any of his condition-action executions
    mapping(address => uint256) public override providerFunding;
    // What the provider must keep on GelatoCore for all their outstanding ExecutionClaims
    mapping(address => uint256) public override lockedProviderFunds;
    // The max GasPrice a provider is willing to pay to executors
    mapping(address => uint256) public override providerGasPriceCeiling;

    //      provider(p) =>     Condition(C) =>    Action(A) => yes/no
    mapping(address => mapping(address => mapping(address => bool))) public override pCA;

    modifier liquidProvider(address _provider, uint256 _projectedProvisionNeeds) {
        require(
            providerFunding[_provider].sub(
                lockedProviderFunds[_provider],
                "GelatoProvider.liquidProvider: providerFunding < lockedProviderFunds"
            ) > _projectedProvisionNeeds,
            "GelatoProvider.liquidProvider: failed"
        );
        _;
    }

   modifier isPCA(address _provider, address _condition, address _action) {
        require(pCA[_provider][_condition][_action], "GelatoProvider.isPCA: !provided");
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
    {
        provideFunds();
        provideCA(_condition, _action);
        if (_gasPriceCeiling != 0) setProviderGasPriceCeiling(_gasPriceCeiling);
        emit LogRegisterProvider(msg.sender);
    }

    // Provider Funding
    function provideFunds() public payable override {
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

    // Provider's Condition Action Pair Whitelist
    function provideCA(address _condition, address _action) public override {
        require(
            !pCA[msg.sender][_condition][_action],
            "GelatoProvider.provideCA: already providing CA."
        );
        pCA[msg.sender][_condition][_action] = true;
        emit LogProvideCA(msg.sender, _condition, _action);
    }

    function unprovideCA(address _condition, address _action) external override {
        require(
            pCA[msg.sender][_condition][_action],
            "GelatoProvider.unprovideCA: already not providing CA."
        );
        pCA[msg.sender][_condition][_action] = false;
        emit LogUnprovideCA(msg.sender, _condition, _action);
    }

    // Set Provider's optional gas price tolerance: 0 = default to gelatoGasPrice
    function setProviderGasPriceCeiling(uint256 _ceiling) public override {
        emit LogSetProviderGasPriceCeiling(providerGasPriceCeiling[msg.sender], _ceiling);
        providerGasPriceCeiling[msg.sender] = _ceiling;
    }
}