pragma solidity ^0.6.0;

import "../../IGelatoTrigger.sol";

contract TriggerMinETHBalanceIncrease is IGelatoTrigger {

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Unfulfilled Conditions
        MinETHBalanceNotReached
    }

    // triggerSelector public state variable np due to this.actionSelector constant issue
    function triggerSelector() external pure override returns(bytes4) {
        return this.fired.selector;
    }
    uint256 public constant override triggerGas = 30000;

    function fired(address _account, uint256 _referenceBalance)
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        if (_account.balance >= _referenceBalance) return (true, uint8(Reason.Ok));
        else return(false, uint8(Reason.MinETHBalanceNotReached));
    }

    function getTriggerValue(address _account, uint256) external view returns(uint256) {
        return _account.balance;
    }
}