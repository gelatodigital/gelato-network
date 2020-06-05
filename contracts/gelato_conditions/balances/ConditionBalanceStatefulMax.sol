// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoConditionsStandard } from "../GelatoConditionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";

contract ConditionBalanceStatefulMax {

    using SafeMath for uint256;

    string public constant OK = "OK";

    // userProxy => account to monitor => token/ETH-id  => refBalance
    mapping(address => mapping(address => mapping(address => uint256))) public refBalance;

    function ok(bytes calldata _conditionDataWithSelector)
        external
        view
        virtual
        returns(string memory)
    {
        (address _userProxy,
         address _account,
         address _token,
         bool _greaterElseSmaller) = abi.decode(
            _conditionDataWithSelector[4:],
            (address,address,address,bool)
        );
        return ok(_userProxy, _account, _token, _greaterElseSmaller);
    }


    // Specific Implementation
    function ok(address _userProxy, address _account, address _token, bool _greaterElseSmaller)
        public
        view
        virtual
        returns(string memory)
    {
        uint256 _refBalance = refBalance[_userProxy][_account][_token];
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


    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    function setRefBalanceDelta(address _account, address _token, bool _greaterElseSmaller, uint256 _delta)
        external
    {
        uint256 currentBalanceOfAccount;
        uint256 newRefBalance;
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) // ETH
            currentBalanceOfAccount = _account.balance;
        else currentBalanceOfAccount = IERC20(_token).balanceOf(_account);
        newRefBalance = _greaterElseSmaller ? currentBalanceOfAccount + _delta : currentBalanceOfAccount.sub(_delta, "Underflow");
        refBalance[msg.sender][_account][_token] = newRefBalance;
    }
}