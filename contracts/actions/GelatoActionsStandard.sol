pragma solidity ^0.6.0;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    modifier actionGasCheck virtual {_;}

    function actionConditionsOk(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        override
        virtual
        returns(bool)
    {
        // solhint-disable-next-line
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }
}
