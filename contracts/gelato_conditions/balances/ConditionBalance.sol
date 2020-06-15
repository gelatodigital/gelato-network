// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../GelatoConditionsStandard.sol";
import {IERC20} from "../../external/IERC20.sol";

contract ConditionBalance is  GelatoConditionsStandard {

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _account,
        address _token,
        uint256 _refBalance,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.balanceCheck.selector,
            _account,
            _token,
            _refBalance,
            _greaterElseSmaller
        );
    }

    /// @param _conditionData The encoded data from getConditionData()
     function ok(uint256, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address _account,
         address _token,
         uint256 _refBalance,
         bool _greaterElseSmaller) = abi.decode(
            _conditionData[4:],
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