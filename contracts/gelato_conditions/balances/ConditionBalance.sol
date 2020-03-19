pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCondition, PossibleConditionValues } from "../IGelatoCondition.sol";
import "../../external/IERC20.sol";

contract ConditionBalance is IGelatoCondition {

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.ok.selector;
    }

    /// @dev Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH coin
    function ok(bytes calldata _conditionPayload)
        external
        view
        override
        returns(string memory)  // executable?, reason
    {
        // Extract condition.ok() params from payload
        (address account,
         address coin,
         uint256 refBalance,
         bool greaterElseSmaller) = abi.decode(
             _conditionPayload[4:],
             (address,address,uint256,bool)
         );

        // ETH balances
        if (coin == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (greaterElseSmaller) {  // greaterThan
                if (account.balance >= refBalance) return "ok0";
                return "NotOkETHBalanceIsNotGreaterThanRefBalance";
            } else {  // smallerThan
                if (account.balance <= refBalance) return "ok1";
                return "NotOkETHBalanceIsNotSmallerThanRefBalance";
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(coin);
            try erc20.balanceOf(account) returns (uint256 erc20Balance) {
                if (greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= refBalance) return "ok2";
                    return "NotOkERC20BalanceIsNotGreaterThanRefBalance";
                } else {  // smallerThan
                    if (erc20Balance <= refBalance) return "ok3";
                    return "NotOkERC20BalanceIsNotSmallerThanRefBalance";
                }
            } catch {
                return "ERC20Error";
            }
        }
    }

    function currentState(bytes calldata _conditionPayload)
        external
        view
        override
        returns(PossibleConditionValues memory _values)
    {
        (address account, address coin) = abi.decode(
            _conditionPayload[36:68],
            (address, address)
        );
        if (coin == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
            _values.uints[0] = account.balance;
        IERC20 erc20 = IERC20(coin);
        _values.uints[0] = erc20.balanceOf(account);
    }
}