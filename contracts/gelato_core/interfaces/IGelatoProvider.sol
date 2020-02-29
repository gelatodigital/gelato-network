pragma solidity ^0.6.2;

import "./IGelatoProviderModule.sol";

interface IGelatoProvider {
    event LogSetProviderModule(IGelatoProviderModule indexed providerModule);

    event LogProvideCondition(address indexed condition);
    event LogUnprovideCondition(address indexed condition);

    event LogProvideAction(address indexed action);
    event LogUnprovideAction(address indexed action);

    event LogProvideFunds(
        address indexed provider,
        uint256 previousProviderFunding,
        uint256 newProviderFunding
    );
    event LogUnprovideFunds(
        address indexed provider,
        uint256 previousProviderFunding,
        uint256 newProviderFunding
    );

    // Provider Module
    function setProviderModule(IGelatoProviderModule _providerModule) external;
    function providerModule(address _provider) external view returns(IGelatoProviderModule);


    function provideCondition(address _condition) external;
    function unprovideCondition(address _condition) external;

    function provideAction(address _action) external;
    function unprovideAction(address _action) external;

    // Provider Funding
    function provideFunds() external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;
    function providerFunds(address _provider) external view returns (uint256);

    // Returns true if provider has funds to cover provisionPerExecutionClaim
    function isProviderLiquid(address _provider, uint256 _gasPrice, uint256 _gasDemand)
        external
        view
        returns(bool);
}