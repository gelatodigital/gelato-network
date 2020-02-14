pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/IERC20.sol";

contract ConditionBalance is IGelatoCondition {

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok: Fulfilled Conditions
        OkETHBalanceIsGreaterThanRefBalance,
        OkERC20BalanceIsGreaterThanRefBalance,
        OkETHBalanceIsSmallerThanRefBalance,
        OkERC20BalanceIsSmallerThanRefBalance,
        // NotOk: Unfulfilled Conditions
        NotOkETHBalanceIsNotGreaterThanRefBalance,
        NotOkERC20BalanceIsNotGreaterThanRefBalance,
        NotOkETHBalanceIsNotSmallerThanRefBalance,
        NotOkERC20BalanceIsNotSmallerThanRefBalance,
        ERC20Error
    }

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }
    uint256 public constant override conditionGas = 30000;

    /// @dev Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH _coin
    /// @param _coin ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) or ERC20
    function reached(
        address _account,
        address _coin,
        uint256 _refBalance,
        bool _greaterElseSmaller
    )
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        // ETH balances
        if (_coin == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= _refBalance)
                    return (true, uint8(Reason.OkETHBalanceIsGreaterThanRefBalance));
                else
                    return(false, uint8(Reason.NotOkETHBalanceIsNotGreaterThanRefBalance));
            } else {  // smallerThan
                if (_account.balance <= _refBalance)
                    return (true, uint8(Reason.OkETHBalanceIsSmallerThanRefBalance));
                else
                    return(false, uint8(Reason.NotOkETHBalanceIsNotSmallerThanRefBalance));
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_coin);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= _refBalance)
                        return (true, uint8(Reason.OkERC20BalanceIsGreaterThanRefBalance));
                    else
                        return(false, uint8(Reason.NotOkERC20BalanceIsNotGreaterThanRefBalance));
                } else {  // smallerThan
                    if (erc20Balance <= _refBalance)
                        return (true, uint8(Reason.OkETHBalanceIsSmallerThanRefBalance));
                    else
                        return(false, uint8(Reason.NotOkERC20BalanceIsNotSmallerThanRefBalance));
                }
            } catch {
                return(false, uint8(Reason.ERC20Error));
            }
        }
    }

    function getConditionValue(address _account, address _coin, uint256, bool)
        external
        view
        returns(uint256)
    {
        if (_coin == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
            return _account.balance;
        IERC20 erc20 = IERC20(_coin);
        return erc20.balanceOf(_account);
    }
}