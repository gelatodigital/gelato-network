// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";

/// @title ActionWithdrawBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that withdraws funds from Batch Exchange

contract ActionWithdrawBatchExchange is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // BatchExchange
    IBatchExchange public immutable batchExchange;

    constructor(address _batchExchange) public {
        batchExchange = IBatchExchange(_batchExchange);
    }

    /// @notice Withdraw token from Batch Exchange
    /// @param _token Token to withdraw from Batch Exchange
    function action(
        address _token,
        bool
    )
        public
        virtual
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

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(
        bytes calldata _actionData,
        bytes calldata
    ) external virtual override returns(ReturnType, bytes memory) {

        // 1. Decode Action data
        ( address _token, bool returnsTaskState)  =
        abi.decode(_actionData[4:], (address, bool));

        // 2. Call action
        uint256 withdrawAmount = action(_token, returnsTaskState);

        // 3. Return Task State
        return(returnsTaskState ? ReturnType.UINT_AND_ERC20 : ReturnType.NONE, abi.encode(withdrawAmount, _token));
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _token, /*bool returnsTaskState*/) = abi.decode(
            _actionData[4:],
            (address,bool)
        );
        return termsOk(_userProxy, _token);
    }

    /// @notice Verify that _userProxy has a valid withdraw request on batch exchange
    /// @param _userProxy Users Proxy address
    /// @param _token Token to withdraw
    function termsOk(address _userProxy, address _token)
        public
        view
        virtual
        returns(string memory)  // actionCondition
    {
        bool tokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _token);

        if (!tokenWithdrawable)
            return "ActionWithdrawBatchExchange: Token not withdrawable yet";

        return OK;
    }
}