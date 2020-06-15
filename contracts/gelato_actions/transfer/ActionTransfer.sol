// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {IERC20} from "../../external/IERC20.sol";
import {Address} from "../../external/Address.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";

/// @dev This action is for user proxies that store funds.
contract ActionTransfer is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address payable;
    using SafeERC20 for IERC20;

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(address _sendToken, uint256 _sendAmount, address _destination)
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _sendToken,
            _sendAmount,
            _destination
        );
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_IN_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_OUT_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    // ======= ACTION IMPLEMENTATION DETAILS =========
    /// @dev Always use this function for encoding _actionData off-chain
    ///  Will be called by GelatoActionPipeline if Action.dataFlow.None
    function action(address sendToken, uint256 sendAmount, address destination)
        public
        virtual
        delegatecallOnly("ActionTransfer.action")
    {
        if (sendToken != ETH_ADDRESS) {
            IERC20 sendERC20 = IERC20(sendToken);
            sendERC20.safeTransfer(destination, sendAmount, "ActionTransfer.action:");
            emit LogOneWay(address(this), sendToken, sendAmount, destination);
        } else {
            payable(destination).sendValue(sendAmount);
        }
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (address,uint256));
        address destination = abi.decode(_actionData[68:100], (address));
        action(sendToken, sendAmount, destination);
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.Out
    //  => do not use for _actionData encoding
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        virtual
        override
        returns (bytes memory)
    {
        (address sendToken, uint256 sendAmount, address destination) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );
        action(sendToken, sendAmount, destination);
        return abi.encode(sendToken, sendAmount);
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.InAndOut
    //  => do not use for _actionData encoding
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        virtual
        override
        returns (bytes memory)
    {
        (address sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (address,uint256));
        address destination = abi.decode(_actionData[68:100], (address));
        action(sendToken, sendAmount, destination);
        return abi.encode(sendToken, sendAmount);
    }

    // ===== ACTION TERMS CHECK ========
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
        if (this.action.selector != GelatoBytes.calldataSliceSelector(_actionData))
            return "ActionTransfer: invalid action selector";

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
}
