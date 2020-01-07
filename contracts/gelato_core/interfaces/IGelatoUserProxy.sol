pragma solidity ^0.6.0;

import "../../actions/IGelatoAction.sol";
import "../GelatoCoreEnums.sol";

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
        returns(uint8 executionResult, uint8 reason);

    function getUser() external view returns(address);

    function getGelatoCore() external view returns(address);
}