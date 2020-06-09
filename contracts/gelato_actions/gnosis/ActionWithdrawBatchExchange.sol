// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {GelatoActionsStandard} from "../GelatoActionsStandard.sol";
import {
    IGelatoOutFlowAction
} from "../action_pipeline_interfaces/IGelatoOutFlowAction.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {DataFlowType} from "../action_pipeline_interfaces/DataFlowType.sol";
import {IERC20} from "../../external/IERC20.sol";
import {IBatchExchange} from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";

/// @title ActionWithdrawBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato Action that withdraws funds from BatchExchange and returns withdrawamount
/// @dev Can be used in a GelatoActionPipeline as OutFlowAction.
contract ActionWithdrawBatchExchange is GelatoActionsStandard, IGelatoOutFlowAction {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IBatchExchange public immutable batchExchange;

    constructor(IBatchExchange _batchExchange) public { batchExchange = _batchExchange; }

    /// @notice Withdraw token from Batch Exchange
    /// @dev delegatecallOnly
    /// @param _token Token to withdraw from Batch Exchange
    function action(address _token)
        public
        virtual
        delegatecallOnly("ActionWithdrawBatchExchange.action")
        returns (uint256 withdrawAmount)
    {
        IERC20 token = IERC20(_token);
        uint256 preTokenBalance = token.balanceOf(address(this));

        try batchExchange.withdraw(address(this), _token) {
            uint256 postTokenBalance = token.balanceOf(address(this));
            if (postTokenBalance > preTokenBalance)
                withdrawAmount = postTokenBalance - preTokenBalance;
        } catch {
           revert("ActionWithdrawBatchExchange.withdraw _token failed");
        }
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.Out
    //  => do not use for _actionData encoding
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        virtual
        override
        returns (DataFlowType, bytes memory)
    {
        address token = abi.decode(_actionData[4:], (address));
        uint256 withdrawAmount = action(token);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(token, withdrawAmount));
    }

    // ======= ACTION TERMS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow,
        uint256,  // value
        uint256  // cycleId
    )
        public
        view
        virtual
        override
        returns(string memory)  // actionCondition
    {
        address token = abi.decode(_actionData[4:], (address));
        bool tokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, token);
        if (!tokenWithdrawable)
            return "ActionWithdrawBatchExchange: Token not withdrawable yet";
        return OK;
    }
}