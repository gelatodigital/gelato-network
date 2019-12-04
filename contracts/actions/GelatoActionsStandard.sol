pragma solidity ^0.5.13;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
contract GelatoActionsStandard is IGelatoAction {

    IGelatoCore internal gelatoCore;
    bytes4 internal actionSelector;
    uint256 internal actionConditionsOkGas;
    uint256 internal actionGas;
    uint256 internal actionGasTotal;

    event LogAction(address indexed user);

    constructor() internal {
        gelatoCore = IGelatoCore(0x3C64f059a17beCe12d5C43515AB67836c5857E26);
    }

    function getGelatoCore() external view returns(IGelatoCore) {return gelatoCore;}
    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionConditionsOkGas() external view returns(uint256) {return actionConditionsOkGas;}
    function getActionGas() external view returns(uint256) {return actionGas;}
    function getActionGasTotal() external view returns(uint256) {return actionGasTotal;}

    function actionConditionsOk(bytes calldata)  // _actionPayloadWithSelector
        external
        view
        returns(bool)
    {
        this;  // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return true;
    }

    function getProxyOfUser(address payable _user)
        external
        view
        returns(IGelatoUserProxy)
    {
        return _getProxyOfUser(_user);
    }

    function _getProxyOfUser(address _user)
        internal
        view
        returns(IGelatoUserProxy)
    {
        return gelatoCore.getProxyOfUser(_user);
    }

    function _setActionGasTotal() private {
        actionGasTotal = actionConditionsOkGas + actionGas;
    }
}
