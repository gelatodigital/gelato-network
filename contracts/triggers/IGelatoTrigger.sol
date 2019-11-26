pragma solidity ^0.5.10;

import "../actions/IGelatoAction.sol";

interface IGelatoTrigger {
    function getTriggerSelector() external view returns(bytes4);

    function fired(// Standard Trigger Params
                   IGelatoAction _action,
                   bytes calldata _actionPayloadWithSelector,
                   // Specific Trigger Params
                   bytes calldata _specificTriggerParams
    )
        external
        view
        returns(bool);
}