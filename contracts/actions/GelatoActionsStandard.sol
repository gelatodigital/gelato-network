pragma solidity ^0.5.10;

import "./IGelatoAction.sol";

contract GelatoActionsStandard is IGelatoAction {

    enum ActionOperation { call, delegatecall }

    IGelatoCore internal gelatoCore;
    ActionOperation internal actionOperation;
    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    // Standard Event
    event LogAction(address indexed user);

    /// @dev non-deploy base contract
    constructor()
        internal
    {
        gelatoCore = IGelatoCore(0x3C64f059a17beCe12d5C43515AB67836c5857E26);
    }

    /// @dev abstract fn -> non-deploy base contract
    function getGelatoCore() external view returns(IGelatoCore) {return gelatoCore;}
    function getActionOperation() external view returns(ActionOperation) {return actionOperation;}
    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external view returns(uint256) {return actionGasStipend;}

    function getProxyOfUser(address payable _user)
        external
        view
        returns(IGelatoUserProxy)
    {
        return _getProxyOfUser(_user);
    }

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * param bytes: the actionPayload (with actionSelector)
     * @return boolean true if specific action conditions are fulfilled, else false.
     */
    function actionConditionsOk(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        returns(bool)
    {
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }

    function _getProxyOfUser(address _user)
        internal
        view
        returns(IGelatoUserProxy)
    {
        return gelatoCore.getProxyOfUser(_user);
    }
}
