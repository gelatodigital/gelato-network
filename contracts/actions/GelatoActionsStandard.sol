pragma solidity ^0.6.0;

import "./IGelatoAction.sol";
import "../helpers/SplitFunctionSelector.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction, SplitFunctionSelector {

    /* CAUTION: all actions must have their action() function according to the following standard format:
        -  Param1: address _user,
        -  Param2: address _userProxy
    => function action(address _user, address _userProxy, ....) external returns (GelatoCoreEnums.ExecutionResults, Reason):
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
        return (true, uint8(ActionConditionPrototype.Ok));
    }

    /// @dev All actions must override this with their own implementation
    ///  until array slicing syntax implementation is possible
    function getUsersSourceTokenBalance(bytes calldata)
        external
        view
        override
        virtual
        returns(uint256 userSrcBalance)
    {
        this;
        return 0;
    }
}
