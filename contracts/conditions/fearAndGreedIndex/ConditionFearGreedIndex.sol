pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/Ownable.sol";
import "../../external/SafeMath.sol";

contract ConditionFearGreedIndex is IGelatoCondition, Ownable {

    using SafeMath for uint256;

    event LogNewIndex(uint256 indexed newIndex);

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }

    // @ Dev allocated randomly
    uint256 public constant override conditionGas = 500000;

    // State
    uint256 public fearAndGreedIndex;

    // FearAndGreedIndex Oracle
    function setOracle(uint256 _newValue)
        external
        onlyOwner
    {
        require(
            _newValue >= 0 && _newValue <= 100,
            "ConditionFearGreedIndex.setOracle: not between 0 and 100"
        );
        require(
            _newValue.mod(10) == 0 ,
            "ConditionFearGreedIndex.setOracle: only accept increments of 10"
        );
        fearAndGreedIndex = _newValue;
        emit LogNewIndex(_newValue);
    }


    /// @dev Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH _coin
    function reached(uint256 _oldFearAndGreedIndex)
        external
        view
        returns(bool, string memory)  // executable?, reason
    {
        require(
            _oldFearAndGreedIndex.mod(10) == 0 ,
            "ConditionFearGreedIndex.reached: only accept increments of 10"
        );
        if (fearAndGreedIndex >= _oldFearAndGreedIndex.add(10)) {
            return (true, "OkNewIndexIsGreaterBy10");
        } else if (_oldFearAndGreedIndex == 0) {
            if (fearAndGreedIndex >= 10) return (true, "OkNewIndexIsGreaterBy10");
            else return(false, "NotOkNewIndexIsNotSmallerOrGreaterBy10");
        } else if (fearAndGreedIndex <= _oldFearAndGreedIndex.sub(10)) {
            return (true, "OkNewIndexIsSmallerBy10");
        } else {
            return(false, "NotOkNewIndexIsNotSmallerOrGreaterBy10");
        }
    }

    function getConditionValue()
        external
        view
        returns(uint256)
    {
        return fearAndGreedIndex;
    }
}