pragma solidity ^0.5.10;

/// @title IGelatoUserProxy - solidity interface of GelatoTriggersStandard
/// @notice GelatoUserProxy.execute() API called by gelatoCore during .execute()
/// @dev all the APIs are implemented inside GelatoUserProxy
interface IGelatoUserProxy {
    function getUser() external view returns(address payable);
    function getGelatoCore() external view returns(address payable);
    function execute(address payable _action, bytes calldata _actionPayloadWithSelector)
        external
        payable
        returns(bool success, bytes memory returndata);
}