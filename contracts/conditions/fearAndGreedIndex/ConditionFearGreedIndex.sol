pragma solidity ^0.6.2;

import "../IGelatoCondition.sol";
import "../../external/IERC20.sol";
import "../../external/Ownable.sol";
import "../../external/SafeMath.sol";

contract ConditionFearGreedIndex is Ownable, IGelatoCondition {

    using SafeMath for uint256;

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok: Fulfilled Conditions
        OkNewIndexIsGreaterBy10,
        OkNewIndexIsSmallerBy10,
        NotOkNewIndexIsNotSmallerOrGreaterBy10
    }

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }


    // State
    uint256 public fearAndGreedIndex;

    // @ Dev allocated randomly
    uint256 public constant override conditionGas = 500000;


    // FearAndGreedIndex Oracle
    /// @param _newValue new fearAndGreedIndex value
    function setOracle(uint256 _newValue)
        external
        onlyOwner
    {
        require(_newValue >= 0 && _newValue <= 100, "fearAndGreedIndex has to be a value between 0 and 100");
        require(_newValue % 10 == 0 , "only accept increments of 10");
        fearAndGreedIndex = _newValue;
    }


    /// @dev Caution: use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH _coin
    /// @param _oldFearAndGreedIndex old fearAndGreedIndex value
    function reached(
        uint256 _oldFearAndGreedIndex
    )
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        require(_oldFearAndGreedIndex % 10 == 0 , "only accept increments of 10");
        if (fearAndGreedIndex >= _oldFearAndGreedIndex.add(10)) {
            return (true, uint8(Reason.OkNewIndexIsGreaterBy10));
        }
        else if (_oldFearAndGreedIndex == 0)
        {
            if( fearAndGreedIndex >= 10) return (true, uint8(Reason.OkNewIndexIsGreaterBy10));
            else {
                return(false, uint8(Reason.NotOkNewIndexIsNotSmallerOrGreaterBy10));
            }
        }
        else if (fearAndGreedIndex <= _oldFearAndGreedIndex.sub(10))
        {
            return (true, uint8(Reason.OkNewIndexIsSmallerBy10));
        } else
        {
            return(false, uint8(Reason.NotOkNewIndexIsNotSmallerOrGreaterBy10));
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