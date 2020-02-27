pragma solidity ^0.6.2;

/// @title IProviderWhitelistModule
/// @notice An example provider module that whitelists conditions and actions
interface IProviderWhitelistModule {
    event LogProvideCondition(address indexed condition);
    event LogUnprovideCondition(address indexed condition);

    event LogProvideAction(address indexed action);
    event LogUnprovideAction(address indexed action);

    function provideCondition(address _condition) external;
    function unprovideCondition(address _action) external;

    function provideAction(address _action) external;
    function unprovideAction(address _action) external;

    function isProvidedCondition(address _condition) external view returns(bool);
    function isProvidedAction(address _action) external view returns(bool);

    function getProvidedConditions() external view returns(address[] memory conditions);
    function getProvidedActions() external view returns(address[] memory actions);


    function gelatoCore() external view returns(IGelatoCore gelatoCore);
}