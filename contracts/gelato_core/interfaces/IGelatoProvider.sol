pragma solidity ^0.6.2;

interface IGelatoProvider {
    event LogProvideCondition(
        address indexed provider,
        address indexed condition
    );
    event LogUnprovideCondition(
        address indexed provider,
        address indexed condition
    );

    event LogProvideAction(address indexed provider, address indexed action);
    event LogUnprovideAction(address indexed provider, address indexed action);

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

    function registerProvider(
        address[] calldata _conditions,
        address[] calldata _actions
    ) external payable;

    function unregisterProvider(
        address[] calldata _conditions,
        address[] calldata _actions
    ) external;

    function provideCondition(address _condition) external;
    function unprovideCondition(address _condition) external;

    function provideAction(address _action) external;
    function unprovideAction(address _action) external;

    function provideFunds(address _provider) external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;

    function providerFunds(address _provider) external view returns (uint256);

    function isProvidedCondition(address _provider, address _condition)
        external
        view
        returns (bool);
    function isProvidedAction(address _provider, address _action)
        external
        view
        returns (bool);

    function isProviderLiquid(
        address _provider,
        uint256 _gasPrice,
        uint256 _gasDemand
    ) external view returns (bool);
}
