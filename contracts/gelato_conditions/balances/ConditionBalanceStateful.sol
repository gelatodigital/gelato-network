// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {GelatoStatefulConditionsStandard} from "../GelatoStatefulConditionsStandard.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IGelatoCore} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../external/IERC20.sol";


contract ConditionBalanceStateful is GelatoStatefulConditionsStandard {

    using SafeMath for uint256;

    // userProxy => taskReceiptId => refBalance
    mapping(address => mapping(uint256 => uint256)) public refBalance;

    constructor(IGelatoCore _gelatoCore)
        GelatoStatefulConditionsStandard(_gelatoCore)
        public
    {}

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _userProxy,
        address _account,
        address _token,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.checkRefBalance.selector,
            uint256(0),  //  taskReceiptId placeholder
            _userProxy,
            _account,
            _token,
            _greaterElseSmaller
        );
    }

    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address _userProxy,
         address _account,
         address _token,
         bool _greaterElseSmaller) = abi.decode(
             _conditionData[36:],  // slice out selector and _taskReceiptId
             (address,address,address,bool)
        );
        return checkRefBalance(
            _taskReceiptId, _userProxy, _account, _token, _greaterElseSmaller
        );
    }

    // Specific Implementation
    /// @dev Abi encode these parameter inputs. Use a placeholder for _taskReceiptId.
    /// @param _taskReceiptId Will be stripped from encoded data and replaced by
    ///  the value passed in from GelatoCore.
    function checkRefBalance(
        uint256 _taskReceiptId,
        address _userProxy,
        address _account,
        address _token,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 _refBalance = refBalance[_userProxy][_taskReceiptId];
        // ETH balances
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            if (_greaterElseSmaller) {  // greaterThan
                if (_account.balance >= _refBalance) return OK;
                return "NotOkETHBalanceIsNotGreaterThanRefBalance";
            } else {  // smallerThan
                if (_account.balance <= _refBalance) return OK;
                return "NotOkETHBalanceIsNotSmallerThanRefBalance";
            }
        } else {
            // ERC20 balances
            IERC20 erc20 = IERC20(_token);
            try erc20.balanceOf(_account) returns (uint256 erc20Balance) {
                if (_greaterElseSmaller) {  // greaterThan
                    if (erc20Balance >= _refBalance) return OK;
                    return "NotOkERC20BalanceIsNotGreaterThanRefBalance";
                } else {  // smallerThan
                    if (erc20Balance <= _refBalance) return OK;
                    return "NotOkERC20BalanceIsNotSmallerThanRefBalance";
                }
            } catch {
                return "ERC20Error";
            }
        }
    }

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// This is for Task Cycles/Chains and we fetch the TaskReceipt.id of the
    //  next Task that will be auto-submitted by GelatoCore in the same exec Task transaction.
    /// @param _balanceDelta The change in balance after which this condition should return for a given taskId
    /// @param _idDelta Default to 0. If you submit multiple tasks in one action, this can help
    // customize which taskId the state should be allocated to
    function setRefBalance(
        address _account,
        address _token,
        int256 _balanceDelta,
        uint256 _idDelta
    )
        external
    {
        uint256 currentBalanceOfAccount;
        uint256 newRefBalance;
        if (_token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) // ETH
            currentBalanceOfAccount = _account.balance;
        else currentBalanceOfAccount = IERC20(_token).balanceOf(_account);
        require(
            int256(currentBalanceOfAccount) + _balanceDelta >= 0,
            "ConditionBalanceStateful.setRefBalanceDelta: underflow"
        );
        newRefBalance = uint256(int256(currentBalanceOfAccount) + _balanceDelta);
        refBalance[msg.sender][_getIdOfNextTaskInCycle() + _idDelta] = newRefBalance;
    }
}