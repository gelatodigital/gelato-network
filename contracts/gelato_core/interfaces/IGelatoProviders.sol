pragma solidity ^0.6.4;

import "../gelato_providers/provider_module/IGelatoProviderModule.sol";

interface IGelatoProviders {
    // Registration
    event LogRegisterProvider(address indexed provider);
    event LogUnregisterProvider(address indexed provider);
    // Provider Funding
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
    event LogSetProviderWhitelist(
        IGelatoProviderModule oldModule,
        IGelatoProviderModule newModule
    );

    // Registration
    function registerProvider(IGelatoProviderModule _module) external payable;
    function unregisterProvider() external;

    // Provider Funding
    function provideFunds(address _provider) external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;

    // Provider Module
    function setProviderModule(IGelatoProviderModule _module) external;

    // Registration
    function isRegisteredProvider(address _provider)
        external
        view
        returns (bool);

    // Provider Funding
    function providerFunds(address _provider) external view returns (uint256);

    // Provider Module
    function providerModule(address _provider)
        external
        view
        returns (IGelatoProviderModule);

    // IGelatoProviderModule Standard wrapper
    function isProvided(
        address _providerModule,
        address _userProxy,
        address _condition,
        address _action
    ) external view returns (bool);
}
