pragma solidity ^0.6.4;

import "./IGelatoCondition.sol";

abstract contract GelatoConditionsStandard is IGelatoCondition {
    function okStandardSelector() external pure override returns(bytes4) {
        return IGelatoCondition.ok.selector;
    }
}
