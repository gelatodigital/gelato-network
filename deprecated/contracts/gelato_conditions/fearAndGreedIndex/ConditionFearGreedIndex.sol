pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../GelatoConditionsStandard.sol";
import "../../external/Ownable.sol";
import "../../external/SafeMath.sol";

contract ConditionFearGreedIndex is GelatoConditionsStandard, Ownable {

    using SafeMath for uint256;

    event LogSet(uint256 indexed oldIndex, uint256 indexed newIndex);

    // Specific Implementation
    uint256 public value;  // between 0 - 100

    // FearAndGreedIndex Oracle
    function set(uint256 _newValue) external onlyOwner {
        require(
            _newValue >= 0 && _newValue <= 100,
            "ConditionFearGreedIndex.setOracle: not between 0 and 100"
        );
        require(
            _newValue.mod(10) == 0 ,
            "ConditionFearGreedIndex.setOracle: only accept increments of 10"
        );
        emit LogSet(value, _newValue);
        value = _newValue;
    }


    // STANDARD Interface
    function ok(bytes calldata _conditionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        uint256 prevIndex = abi.decode(_conditionData[4:], (uint256));
        return ok(prevIndex);
    }

    // Specific implementation
    function ok(uint256 _prevIndex) public view virtual returns(string memory) {
        require(
            _prevIndex >= 0 && _prevIndex <= 100,
            "ConditionFearGreedIndex.ok: _prevIndex between 0 and 100"
        );
        require(
            _prevIndex.mod(10) == 0 ,
            "ConditionFearGreedIndex.ok: _prevIndex increments of 10"
        );

        bool prevIndexIsZero = _prevIndex == 0;

        if (value >= _prevIndex + 10) return OK;
        else if (!prevIndexIsZero && value <= _prevIndex - 10) return OK;
        return "NewIndexIsNotSmallerOrGreater";
    }
}