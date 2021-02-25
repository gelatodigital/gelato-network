// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../external/IERC20.sol";
import {Address} from "../../external/Address.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";

contract ActionERC20TransferFrom is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    /// Use "address _sendToken" for Human Readable ABI.
    function getActionData(
        address _user,
        IERC20 _sendToken,
        uint256 _sendAmount,
        address _destination
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _user,
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
    /// Use "address _sendToken" for Human Readable ABI.
    function action(
        address _user,
        IERC20 _sendToken,
        uint256 _sendAmount,
        address _destination
    )
        public
        virtual
        delegatecallOnly("ActionERC20TransferFrom.action")
    {
        _sendToken.safeTransferFrom(
            _user, _destination, _sendAmount, "ActionERC20TransferFrom.action:"
        );
        emit LogOneWay(_user, address(_sendToken), _sendAmount, _destination);
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        address user = abi.decode(_actionData[4:36], (address));
        address destination = abi.decode(_actionData[100:132], (address));
        (IERC20 sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (IERC20,uint256));
        action(user, sendToken, sendAmount, destination);
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
        (address user,
         IERC20 sendToken,
         uint256 sendAmount,
         address destination) = abi.decode(
            _actionData[4:],
            (address,IERC20,uint256,address)
        );
        action(user, sendToken, sendAmount, destination);
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
        address user = abi.decode(_actionData[4:36], (address));
        address destination = abi.decode(_actionData[100:132], (address));
        (IERC20 sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (IERC20,uint256));
        action(user, sendToken, sendAmount, destination);
        return abi.encode(sendToken, sendAmount);
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
        if (this.action.selector != GelatoBytes.calldataSliceSelector(_actionData))
            return "ActionERC20TransferFrom: invalid action selector";

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
}
