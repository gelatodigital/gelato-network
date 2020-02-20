pragma solidity ^0.6.2;

interface IGelatoProvider {
    // Provider Registration
    event LogRegisterProvider(address provider);

    // Provider Funding
    event LogProvideFunds(
        address indexed provider,
        uint256 previousProviderFunding,
        uint256 newProviderFunding,
        uint256 lockedProviderFunds
    );
    event LogUnprovideFunds(
        address indexed provider,
        uint256 previousProviderFunding,
        uint256 newProviderFunding,
        uint256 lockedProviderFunds
    );

    // Provider's Condition Action Pair Whitelis
    event LogProvideCA(
        address indexed provider,
        address indexed condition,
        address indexed action
    );
    event LogUnprovideCA(
        address indexed provider,
        address indexed condition,
        address indexed action
    );

    // Provider's optional gas price ceiling
    event LogSetProviderGasPriceCeiling(
        uint256 previousCeiling,
        uint256 newCeiling
    );

    // Provider Registration
    function registerProvider(address _condition, address _action)
        external
        payable;

    // Provider Funding
    function provideFunds() external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;
    function providerFunding(address _provider) external view returns (uint256);

    // The amount of funds the  provider currently unprovide
    function lockedProviderFunds(address _provider)
        external
        view
        returns (uint256);

    // Provider's Condition Action Pair Whitelist
    function provideCA(address _condition, address _action) external;
    function unprovideCA(address _condition, address _action) external;
    function pCA(address _provider, address _condition, address _action)
        external
        view
        returns (bool);

    /// @notice providerGasPriceCeiling of 0 defaults to gelatoGasPrice oracle
    function setProviderGasPriceCeiling(uint256 _ceiling) external;
    function providerGasPriceCeiling(address _provider) external view returns(uint256);
}
