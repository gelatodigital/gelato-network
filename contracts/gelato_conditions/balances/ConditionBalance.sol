// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../GelatoConditionsStandard.sol";
import {IERC20} from "../../external/IERC20.sol";

contract ConditionBalance is  GelatoConditionsStandard {

     function ok(uint256, bytes calldata _balanceCheckData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        (address _account, address _token, uint256 _refBalance, bool _greaterElseSmaller) = abi.decode(
            _balanceCheckData,
            (address,address,uint256,bool)
        );
        return balanceCheck(_account, _token, _refBalance, _greaterElseSmaller);
    }


    // Specific Implementation
    function balanceCheck(
        address _account,
        address _token,
        uint256 _refBalance,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        // ETH balances
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= _refBalance) return OK;
                return "NotOkETHBalanceIsNotGreaterThanRefBalance";
            } else {  // smallerThan
                if (_account.balance <= _refBalance) return OK;
                return "NotOkETHBalanceIsNotSmallerThanRefBalance";
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_token);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= _refBalance) return OK;
                    return "NotOkERC20BalanceIsNotGreaterThanRefBalance";
                } else {  // smallerThan
                    if (erc20Balance <= _refBalance) return OK;
                    return "NotOkERC20BalanceIsNotSmallerThanRefBalance";
                }
            } catch {
                return "ERC20Error";
            }
        }
    }
}