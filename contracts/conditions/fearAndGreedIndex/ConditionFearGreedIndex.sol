pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/Ownable.sol";
import "../../external/SafeMath.sol";

contract ConditionFearGreedIndex is IGelatoCondition, Ownable {

    using SafeMath for uint256;

    event LogSetFearAndGreedIndex(uint256 indexed oldIndex, uint256 indexed newIndex);

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }

    // @ Dev allocated randomly
    uint256 public constant override conditionGas = 500000;

    // State
    uint256 public current;  // between 0 - 100

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
        emit LogSetFearAndGreedIndex(current, _newValue);
        current = _newValue;
    }


    /// @dev Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH _coin
    function reached(uint256 _prevFearAndGreedIndex)
        external
        view
        returns(bool, string memory)  // executable?, reason
    {
        require(
            _prevFearAndGreedIndex >= 0 && _prevFearAndGreedIndex <= 100,
            "ConditionFearGreedIndex.reached: _prevFearAndGreedIndex between 0 and 100"
        );
        require(
            _prevFearAndGreedIndex.mod(10) == 0 ,
            "ConditionFearGreedIndex.reached: _prevFearAndGreedIndex increments of 10"
        );

        bool prevIndexIsZero = _prevFearAndGreedIndex == 0;

        if (current >= _prevFearAndGreedIndex + 10)
            return (true, "OkNewIndexIsGreater");
        else if (!prevIndexIsZero && current <= _prevFearAndGreedIndex - 10)
            return (true, "OkNewIndexIsSmaller");
        else return(false, "NotOkNewIndexIsNotSmallerOrGreater");
    }

    function getConditionValue() external view returns(uint256) {
        return current;
    }
}