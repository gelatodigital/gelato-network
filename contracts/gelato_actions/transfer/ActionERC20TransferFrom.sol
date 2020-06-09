// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {DataFlowType} from "../action_pipeline_interfaces/DataFlowType.sol";
import {IERC20} from "../../external/IERC20.sol";
import {Address} from "../../external/Address.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";

contract ActionERC20TransferFrom is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;

    /// @dev Always use this function for encoding _actionData off-chain
    ///  Will be called by GelatoActionPipeline if Action.dataFlow.None
    function action(
        address user,
        IERC20 sendToken,
        uint256 sendAmount,
        address destination
    )
        public
        virtual
        delegatecallOnly("ActionERC20TransferFrom.action")
    {
        sendToken.safeTransferFrom(user, destination, sendAmount);
        emit LogOneWay(user, address(sendToken), sendAmount, destination);
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address user, address destination) = _extractReusableActionData(_actionData);
        (IERC20 sendToken, uint256 sendAmount) = _handleInFlowData(_inFlowData);
        action(user, sendToken, sendAmount, destination);
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
        (address user,
         IERC20 sendToken,
         uint256 sendAmount,
         address destination) = abi.decode(
            _actionData[4:],
            (address,IERC20,uint256,address)
        );
        action(user, sendToken, sendAmount, destination);
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
        (address user, address destination) = _extractReusableActionData(_actionData);
        (IERC20 sendToken, uint256 sendAmount) = _handleInFlowData(_inFlowData);
        action(user, sendToken, sendAmount, destination);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(sendToken, sendAmount));
    }

    // ======= ACTION TERMS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow _dataFlow,
        uint256,  // value
        uint256  // cycleId
    )
        public
        view
        virtual
        override
        returns(string memory)
    {
        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionERC20TransferFrom: termsOk check invalidated by inbound DataFlow";

        (address user, IERC20 sendToken, uint256 sendAmount, ) = abi.decode(
            _actionData[4:],
            (address,IERC20,uint256,address)
        );

        try sendToken.balanceOf(user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }

        try sendToken.allowance(user, _userProxy) returns(uint256 allowance) {
            if (allowance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        return OK;
    }

    // ======= ACTION HELPERS =========
    function _extractReusableActionData(bytes calldata _actionData)
        internal
        pure
        virtual
        returns(address user, address destination)
    {
        user = abi.decode(_actionData[4:36], (address));
        destination = abi.decode(_actionData[100:132], (address));
    }

    function _handleInFlowData(bytes calldata _inFlowData)
        internal
        pure
        virtual
        returns(IERC20 sendToken, uint256 sendAmount)
    {
        (DataFlowType inFlowDataType, bytes memory inFlowData) = abi.decode(
            _inFlowData,
            (DataFlowType, bytes)
        );
        if (inFlowDataType == DataFlowType.TOKEN_AND_UINT256)
            (sendToken, sendAmount) = abi.decode(inFlowData, (IERC20, uint256));
        else revert("ActionERC20TransferFrom._handleInFlowData: invalid inFlowDataType");
    }
}
