pragma solidity ^0.6.4;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    function actionStandardSelector() external pure override returns(bytes4) {
        return IGelatoAction.action.selector;
    }

    function termsOk(bytes calldata)  // _actionPayload
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        this;
        // Standard return value for actionConditions fulfilled and no erros:
        return "Ok";
    }
}
