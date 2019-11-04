pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract GelatoActionsStandard is Initializable
{
    /// @dev non-deploy base contract
    constructor() internal {}

    bytes4 internal actionSelector;
    uint256 internal actionGasStipend;

    function getActionSelector() external view returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external view returns(uint256) {return actionGasStipend;}

    function _initialize(bytes4 _actionSelector, uint256 _actionGasStipend)
        internal
        initializer
    {
        actionSelector = _actionSelector;
        actionGasStipend = _actionGasStipend;
    }

    // FN for standardised action condition checking by triggers (and frontends)
    // Derived contract must override it, to extend it
    function actionConditionsFulfilled(// Standard Param
                                       address,  // user
                                       // Specific Param(s)
                                       bytes calldata  // specificActionParams
    )
        external
        view
        returns(bool)
    {
        return true;
    }
}
