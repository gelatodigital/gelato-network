pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummyRevert is GelatoConditionsStandard {
    // STANDARD interface

    function ok(bytes calldata data) external view virtual override returns(string memory) {
        (bool returnOk) = abi.decode(data[4:], (bool));
        return ok(returnOk);
    }

    function ok(bool returnOk) public pure virtual returns(string memory returnString) {
        if(returnOk) returnString = OK;
        revert("Condition Reverted");
    }
}