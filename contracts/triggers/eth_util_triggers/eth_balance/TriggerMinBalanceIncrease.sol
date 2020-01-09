pragma solidity ^0.6.0;

import "../../IGelatoTrigger.sol";
import "../../../external/IERC20.sol";

contract TriggerMinBalanceIncrease is IGelatoTrigger {

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // NotOk: Unfulfilled Conditions
        MinBalanceIncreaseNotReached,
        ERC20Error
    }

    // triggerSelector public state variable np due to this.actionSelector constant issue
    function triggerSelector() external pure override returns(bytes4) {
        return this.fired.selector;
    }
    uint256 public constant override triggerGas = 30000;

    function fired(bool _eth, address _erc20, address _account, uint256 _refBalance)
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        // ETH balances
        if (_eth)
            if (_account.balance >= _refBalance) return (true, uint8(Reason.Ok));
            else return(false, uint8(Reason.MinBalanceIncreaseNotReached));

        // ERC20 balances
        IERC20 erc20 = IERC20(_erc20);
        try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
            if (erc20Balance >= _refBalance) return (true, uint8(Reason.Ok));
            else return(false, uint8(Reason.MinBalanceIncreaseNotReached));
        } catch {
            return(false, uint8(Reason.ERC20Error));
        }
    }

    function getTriggerValue(bool _eth, address _erc20, address _account, uint256)
        external
        view
        returns(uint256)
    {
        if (_eth) return _account.balance;
        IERC20 erc20 = IERC20(_erc20);
        return erc20.balanceOf(_account);
    }
}