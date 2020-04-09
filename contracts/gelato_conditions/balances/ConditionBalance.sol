pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../GelatoConditionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";

contract ConditionBalance is GelatoConditionsStandard {

    // STANDARD Interface
    // Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH token
    function ok(bytes calldata _conditionPayload)
        external
        view
        override
        virtual
        returns(string memory)  // executable?, reason
    {
        // Extract condition.ok() params from payload
        (address account,
         address token,
         uint256 refBalance,
         bool greaterElseSmaller) = abi.decode(
             _conditionPayload[4:],
             (address,address,uint256,bool)
         );
        return ok(account, token, refBalance, greaterElseSmaller);
    }

    // Specific Implementation
    function ok(address _account, address _token, uint256 _refBalance, bool _greaterElseSmaller)
        public
        view
        virtual
        returns(string memory)
    {
        // ETH balances
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= _refBalance) return "ok0";
                return "NotOkETHBalanceIsNotGreaterThanRefBalance";
            } else {  // smallerThan
                if (_account.balance <= _refBalance) return "ok1";
                return "NotOkETHBalanceIsNotSmallerThanRefBalance";
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_token);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= _refBalance) return "ok2";
                    return "NotOkERC20BalanceIsNotGreaterThanRefBalance";
                } else {  // smallerThan
                    if (erc20Balance <= _refBalance) return "ok3";
                    return "NotOkERC20BalanceIsNotSmallerThanRefBalance";
                }
            } catch {
                return "ERC20Error";
            }
        }
    }
}