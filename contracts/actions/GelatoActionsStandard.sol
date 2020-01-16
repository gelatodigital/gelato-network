pragma solidity ^0.6.0;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    enum StandardReason {
        Ok,
        NotOk,
        UnhandledError
    }

    /* CAUTION All Actions must extend their `enum Reason` from `StandardReason as such:
        0: Ok,  // 0: standard field for Fulfilled Conditions and No Errors
        1: NotOk,  // 1: standard field for Unfulfilled Conditions or Handled Errors
        2: UnhandledError  // 2: standard field for Unhandled or Uncaught Errors
    */

    /* CAUTION: all actions must have their action() function according to the following standard format:
        -  Param1: address _user,
        -  Param2: address _userProxy
    => function action(address _user, address _userProxy, ....) external returns (GelatoCoreEnums.ExecutionResult, Reason):
    action function not defined here because non-overridable, due to different arguments passed across different actions
    */

    function actionConditionsCheck(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        override
        virtual
        returns(bool, uint8)  // executable?, reason
    {
        // solhint-disable-next-line
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return (true, uint8(StandardReason.Ok));
    }
}
