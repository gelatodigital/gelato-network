pragma solidity ^0.6.8;

import { GelatoConditionsStandard } from "../../GelatoConditionsStandard.sol";
import { IERC20 } from "../../../external/IERC20.sol";
import { SafeMath } from "../../../external/SafeMath.sol";

contract ConditionTimeStateful is GelatoConditionsStandard {

    using SafeMath for uint256;

    // userProxy => refTime
    mapping(address => uint256) public refTime;

     // STANDARD interface
    function ok(bytes calldata _conditionData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        (address userProxy) = abi.decode(_conditionData[4:], (address));
        return ok(userProxy);
    }


    // Specific Implementation
    function ok(address _userProxy)
        public
        view
        virtual
        returns(string memory)
    {
        uint256 _refTime = refTime[_userProxy];
        if (_refTime <= block.timestamp) return OK;
        return "NotOkTimestampDidNotPass";
    }


    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    function setRefTime(uint256 _delta)
        external
    {
        uint256 currentTime = block.timestamp;
        uint256 newRefTime = currentTime + _delta;
        refTime[msg.sender] = newRefTime;
    }
}
