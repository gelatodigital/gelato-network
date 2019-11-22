pragma solidity ^0.5.10;

import './IGelatoAction.sol';

contract GelatoActionsStandard is IGelatoAction
{
    /// @dev non-deploy base contract
    constructor() internal {}

    enum ActionOperation { call, delegatecall, proxydelegatecall }
    ActionOperation internal actionOperation;
    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    /// @dev abstract fn -> non-deploy base contract
    function getActionOperation() external view returns(ActionOperation) {return actionOperation;}
    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external view returns(uint256) {return actionGasStipend;}

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * param bytes: the actionPayload (with actionSelector)
     * @return boolean true if specific action conditions are fulfilled, else false.
     */
    function actionConditionsFulfilled(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        returns(bool)
    {
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }

    function _actionConditionsFulfilled(bytes memory _actionPayloadWithSelector
    ) internal view returns(bool);

    modifier actionConditionsCheck(bytes memory _actionPayloadWithSelector) {
        require(_actionConditionsFulfilled(_actionPayloadWithSelector),
            "GelatoActionsStandard.actionConditionsCheck: failed"
        );
        _;
    }

    // Standard Event
    event LogAction(address indexed user);
}
