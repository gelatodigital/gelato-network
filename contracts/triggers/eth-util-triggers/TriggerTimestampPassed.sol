pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../GelatoTriggersStandard.sol";

contract TriggerTimestampPassed is Initializable,
                                   GelatoTriggersStandard
{
    function initialize()
        external
        initializer
    {
        triggerSelector = this.fired.selector;
    }

    function fired(// Standard Trigger Params
                   IGelatoAction _action,
                   bytes calldata _actionPayloadWithSelector,
                   // Specific Trigger Params
                   bytes calldata _specificTriggerParams
    )
        external
        view
        returns(bool)
    {
        uint256 _timestamp = abi.decode(_specificTriggerParams, (uint256));
        return (_actionConditionsFulfilled(_action, _actionPayloadWithSelector) &&
                _timestamp <= block.timestamp
        );
    }

    function getLatestTimestamp()
        external
        view
        returns(uint256)
    {
        return block.timestamp;
    }

}