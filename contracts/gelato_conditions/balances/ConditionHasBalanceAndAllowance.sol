// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../GelatoConditionsStandard.sol";
import {IERC20} from "../../external/IERC20.sol";

contract ConditionHasBalanceAndAllowance is GelatoConditionsStandard {

    /// @dev Use this function to encode the data off-chain for the condition data field
    /// @param _token The token whose balance and allowance we check.
    ///  0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH.
    /// @param _from The account whose balance to check
    /// @param _to The account whose allowance to check. AddressZero for ETH.
    /// @param _value The balance/allowance that needs to be present at least.
    /// @return abi encoded params (without selector)
    function getConditionData(
        address _token,
        address _from,
        address _to,
        uint256 _value
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encode(_from, _to, _token, _value);
    }

    /// @param _conditionData The encoded data from getConditionData()
     function ok(uint256, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address _token,
         address _from,
         address _to,
         uint256 _value) = abi.decode(_conditionData, (address,address,address,uint256));
        return check(_token, _from, _to, _value);
    }

    // Specific Implementation
    function check(address _token, address _from, address _to, uint256 _value)
        public
        view
        virtual
        returns(string memory)
    {
        // ETH balance
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_from.balance >= _value) return OK;
            return "NotOkETHBalance";
        } else {
            // ERC20 balance and allowance
            IERC20 erc20 = IERC20(_token);
            try erc20.balanceOf(_from) returns (uint256 balance) {
                if (balance < _value) return "NotOkERC20Balance";
            } catch {
                return "ERC20BalanceError";
            }
            try erc20.allowance(_from, _to) returns (uint256 allowance) {
                if (allowance >= _value) return OK;
                return "NotOkERC20Allowance";
            } catch {
                return "ERC20AllowanceError";
            }
        }
    }
}