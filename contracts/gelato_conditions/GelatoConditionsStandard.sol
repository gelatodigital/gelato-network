// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import "./IGelatoCondition.sol";

abstract contract GelatoConditionsStandard is IGelatoCondition {
    string internal constant OK = "OK";

    function okStandardSelector() external pure override returns(bytes4) {
        return IGelatoCondition.ok.selector;
    }
}
