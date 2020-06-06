// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";

contract ConditionKyberRateError {

    function canExec(
        uint256 _conditionGas,
        address _conditionKyberRate,
        // The parameters we need to encode
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        external
        view
        returns(string memory)
    {
        bytes memory conditionData = abi.encodeWithSelector(
            IGelatoCondition.ok.selector,
            _src,
            _srcAmt,
            _dest,
            _refRate,
            _greaterElseSmaller
        );

        try IGelatoCondition(_conditionKyberRate).ok{gas: _conditionGas}(conditionData)
            returns(string memory res)
        {
            return res;
        } catch Error(string memory error) {
            return error;
        } catch {
            return "Undefined Error";
        }
    }
}