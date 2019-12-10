pragma solidity ^0.5.11;

import "../../actions/IGelatoAction.sol";

/// @title IGelatoUserProxy - solidity interface of GelatoTriggersStandard
/// @notice GelatoUserProxy.execute() API called by gelatoCore during .execute()
/// @dev all the APIs are implemented inside GelatoUserProxy
interface IGelatoUserProxy {
    function executeCall(
        address _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable
        returns(bool success, bytes memory returndata);

    function executeDelegatecall(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        payable
        returns(bool success, bytes memory returndata);

    function getUser() external view returns(address payable);

    function getGelatoCore() external view returns(address payable);
}