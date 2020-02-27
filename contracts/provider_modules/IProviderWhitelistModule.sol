pragma solidity ^0.6.2;

/// @title IProviderWhitelistModule
/// @notice An example provider module that whitelists conditions and actions
interface IProviderWhitelistModule {
    event LogAddUserProxyRegistry(address indexed registry);
    event LogRemoveUserProxyRegistry(address indexed registry);

    event LogProvideCondition(address indexed condition);
    event LogUnprovideCondition(address indexed condition);

    event LogProvideAction(address indexed action);
    event LogUnprovideAction(address indexed action);

    function provideCondition(address _condition) external;
    function unprovideCondition(address _action) external;

    function provideAction(address _action) external;
    function unprovideAction(address _action) external;

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