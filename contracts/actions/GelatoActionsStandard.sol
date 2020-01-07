pragma solidity ^0.6.0;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

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
