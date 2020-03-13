pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/IERC20.sol";

contract ConditionBalance is IGelatoCondition {

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }

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
        returns(bool, string memory)  // executable?, reason
    {
        // ETH balances
        if (_coin == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= _refBalance) return (true, "0");
                else return(false, "NotOkETHBalanceIsNotGreaterThanRefBalance");
            } else {  // smallerThan
                if (_account.balance <= _refBalance) return (true, "1");
                else return(false, "NotOkETHBalanceIsNotSmallerThanRefBalance");
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_coin);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= _refBalance) return (true, "2");
                    else return(false, "NotOkERC20BalanceIsNotGreaterThanRefBalance");
                } else {  // smallerThan
                    if (erc20Balance <= _refBalance) return (true, "3");
                    else return(false, "NotOkERC20BalanceIsNotSmallerThanRefBalance");
                }
            } catch {
                return(false, "ERC20Error");
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