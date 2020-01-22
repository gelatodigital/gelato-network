pragma solidity ^0.6.0;

import "./IGelatoAction.sol";
import "../helpers/SplitFunctionSelector.sol";
import "../gelato_core/interfaces/IGelatoUserProxy.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction, SplitFunctionSelector {

    /* CAUTION: all actions must have their action() function according to the
    following standard format:
        function action(
            address _user,
            address _userProxy,
            address _source,
            uint256 _sourceAmount,
            address _destination,
            ...
        )
            external;
    action function not defined here because non-overridable, due to
    different arguments passed across different actions
    */

    function actionConditionsCheck(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        this;
        // Standard return value for actionConditions fulfilled and no erros:
        return "ok";
    }

    /// All actions must override this with their own implementation
    /*function getUsersSourceTokenBalance(
        address _user,
        address _userProxy,
        address _source,
        uint256 _sourceAmount,
        address _destination,
        ...
    )
        external
        view
        override
        virtual
        returns(uint256 userSrcBalance);
    getUsersSourceTokenBalance not defined here because non-overridable, due to
    different arguments passed across different actions
    */

    function _isUserOwnerOfUserProxy(address _user, address _userProxy)
        internal
        view
        virtual
        returns(bool)
    {
        address owner = IGelatoUserProxy(_userProxy).user();
        return _user == owner;
    }
}
