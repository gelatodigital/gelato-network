// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandardFull } from "../GelatoActionsStandardFull.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { Address } from "../../external/Address.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { DataFlow } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { DataFlowType } from "../action_pipeline_interfaces/DataFlowType.sol";

/// @dev This action is for user proxies that store funds.
contract ActionTransfer is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address payable;
    using SafeERC20 for IERC20;

    /// @dev Always use this function for encoding _actionData off-chain
    ///  Will be called by GelatoActionPipeline if Action.dataFlow.None
    function action(address sendToken, uint256 sendAmount, address destination)
        public
        virtual
        delegatecallOnly("ActionTransfer.action")
    {
        if (sendToken != ETH_ADDRESS) {
            IERC20 sendERC20 = IERC20(sendToken);
            sendERC20.safeTransfer(destination, sendAmount);
            emit LogOneWay(address(this), sendToken, sendAmount, destination);
        } else {
            payable(destination).sendValue(sendAmount);
        }
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        address destination = _extractReusableActionData(_actionData);
        (address sendToken, uint256 sendAmount) = _handleInFlowData(_inFlowData);
        action(sendToken, sendAmount, destination);
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
        (address sendToken, uint256 sendAmount, address destination) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );
        action(sendToken, sendAmount, destination);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(sendToken, sendAmount));
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.InAndOut
    //  => do not use for _actionData encoding
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        virtual
        override
        returns (DataFlowType, bytes memory)
    {
        (address sendToken, uint256 sendAmount) = _handleInFlowData(_inFlowData);
        address destination = _extractReusableActionData(_actionData);
        action(sendToken, sendAmount, destination);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(sendToken, sendAmount));
    }

    // ===== ACTION TERMS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow _dataFlow,
        uint256  // value
    )
        public
        view
        override
        virtual
        returns(string memory)
    {
        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionTransfer: termsOk check invalidated by inbound DataFlow";

        (address sendToken, uint256 sendAmount) = abi.decode(
            _actionData[4:68],
            (address,uint256)
        );

        if (sendToken == ETH_ADDRESS) {
            if (_userProxy.balance < sendAmount)
                return "ActionTransfer: NotOkUserProxyETHBalance";
        } else {
            try IERC20(sendToken).balanceOf(_userProxy) returns(uint256 sendTokenBalance) {
                if (sendTokenBalance < sendAmount)
                    return "ActionTransfer: NotOkUserProxyERC20Balance";
            } catch {
                return "ActionTransfer: ErrorBalanceOf";
            }
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }

    // ===== ACTION HELPERS ========
    function _handleInFlowData(bytes calldata _inFlowData)
        internal
        pure
        virtual
        returns(address sendToken, uint256 sendAmount)
    {
        (DataFlowType inFlowDataType, bytes memory inFlowData) = abi.decode(
            _inFlowData,
            (DataFlowType, bytes)
        );
        if (inFlowDataType == DataFlowType.TOKEN_AND_UINT256)
            (sendToken, sendAmount) = abi.decode(inFlowData, (address, uint256));
        else revert("ActionTransfer._handleInFlowData: invalid inFlowDataType");
    }

    function _extractReusableActionData(bytes calldata _actionData)
        internal
        pure
        virtual
        returns(address destination)
    {
        destination = abi.decode(_actionData[68:100], (address));
    }
}
