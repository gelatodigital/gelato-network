pragma solidity ^0.6.0;

import "./IGelatoAction.sol";
import "../helpers/SplitFunctionSelector.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction, SplitFunctionSelector {

    /* CAUTION: all actions must have their action() function according to the following standard format:
        -  Param1: address _user,
        -  Param2: address _userProxy
        - Param3: source token Address (also ETH) of token to be transferred/moved/sold ...
        - Param4: source token Amount
        - Param5: destination address
    => function action(address _user, address _userProxy, ....) external;
    action function not defined here because non-overridable, due to different arguments passed across different actions
    */

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

    /*function actionConditionsCheck(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        this;
        // Standard return value for actionConditions fulfilled and no erros:
        return "ok";
    }*/
}
