pragma solidity ^0.5.10;

import '../actions/IGelatoAction.sol';

contract GelatoTriggersStandard
{
    /// @dev non-deploy base contract
    constructor() internal {}

    bytes4 internal triggerSelector;
    
    function getTriggerSelector() external view returns(bytes4) {return triggerSelector;}

    function _actionConditionsFulfilled(address _action,
                                        bytes memory _actionPayloadWithSelector
    )
        internal
        view
        returns(bool)
    {
        return IGelatoAction(_action).actionConditionsFulfilled(_actionPayloadWithSelector);
    }
}