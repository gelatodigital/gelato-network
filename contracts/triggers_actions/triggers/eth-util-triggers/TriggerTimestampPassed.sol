pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import '../GelatoTriggersStandard.sol';

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
                   address _action,
                   bytes calldata _actionPayloadWithSelector,
                   // Specific Trigger Params
                   uint256 _timestamp
    )
        external
        view
        returns(bool)
    {
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