pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummy is GelatoConditionsStandard {
    // STANDARD interface
    function ok(bytes calldata) external view virtual override returns(string memory) {
       return "Ok";
    }
}