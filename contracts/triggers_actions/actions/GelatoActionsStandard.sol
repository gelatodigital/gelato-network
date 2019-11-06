pragma solidity ^0.5.10;

contract GelatoActionsStandard
{
    /// @dev non-deploy base contract
    constructor() internal {}

    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external view returns(uint256) {return actionGasStipend;}

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * param address: the end-users address
     * param bytes: the encoded specific params for the action function
     * @return boolean true if specific action conditions are fulfilled, else false.
     */
    function actionConditionsFulfilled(// Standard Param
                                       address,  // user
                                       // Specific Param(s)
                                       bytes calldata  // specificActionParams
    )
        external
        view
        returns(bool)
    {
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }

    // Standard Event
    event LogAction(address indexed user);
}
