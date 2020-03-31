pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../gelato_conditions/GelatoConditionsStandard.sol";
import { ConditionValues } from "../../gelato_conditions/IGelatoCondition.sol";

contract MockConditionDummy is GelatoConditionsStandard {
    // STANDARD interface
    function ok(bytes calldata) external view virtual override returns(string memory) {
       return "Ok";
    }

    // STANDARD interface
    function currentState(bytes calldata)
        external
        view
        override
        returns(ConditionValues memory _values)
    {
        _values.uints[0] = block.timestamp;
    }
}