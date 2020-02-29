pragma solidity ^0.6.2;

/// @title IProviderWhitelistModule
/// @notice An example provider module that whitelists conditions and actions
interface IProviderWhitelistModule {
    event LogProvideUserProxyRegistry(
        address indexed registry,
        bytes4 indexed proxyCheckSelector
    );
    event LogUnprovideUserProxyRegistry(address indexed registry);

    function provideUserProxyRegistry(address _registry) external;
    function unprovideUserProxyRegistry(address _registry) external;

    function isUserProxyRegistry(address _registry) external view returns(bool);
    function isProvidedCondition(address _condition) external view returns(bool);
    function isProvidedAction(address _action) external view returns(bool);

    function getUserProxyRegistryByIndex(uint256 _index) external view returns(address);
    function getProvidedConditionByIndex(uint256 _index) external view returns(address);
    function getProvidedActionByIndex(uint256 _index) external view returns(address);

    function getUserProxyRegistries() external view returns(address[] memory);
    function getProvidedConditions() external view returns(address[] memory);
    function getProvidedActions() external view returns(address[] memory);

    function isProvidedUserProxy(uint256 _userProxyRegistryIndex, bytes calldata data)
        external
        view
        returns(bool);
}