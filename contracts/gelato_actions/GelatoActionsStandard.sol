pragma solidity ^0.6.6;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    string internal constant OK = "OK";

    function termsOk(bytes calldata, address)  // _actionData
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        this;
        // Standard return value for actionConditions fulfilled and no erros:
        return OK;
    }
}
