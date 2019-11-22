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
                   address _user,
                   bytes calldata _specificActionParams,
                   // Specific Trigger Params
                   uint256 _timestamp
    )
        external
        view
        returns(bool)
    {
        require(_actionConditionsFulfilled(_action, _user, _specificActionParams),
            "TriggerTimestampPassed.fired._actionConditionsFulfilled: failed"
        );
        return _timestamp <= block.timestamp;
    }

    function getLatestTimestamp()
        external
        view
        returns(uint256)
    {
        return block.timestamp;
    }

}