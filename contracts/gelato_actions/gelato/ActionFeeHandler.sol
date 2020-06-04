// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";
import { SafeMath } from "../../external/SafeMath.sol";

contract ActionFeeHandler is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public immutable callStateContext;
    address public immutable provider;
    uint256 public immutable feeNum;
    uint256 public immutable feeDen;

    constructor(address _provider, uint256 _num, uint256 _den) public {
        callStateContext = address(this);
        provider = _provider;
        feeNum = _num;
        feeDen = _den;
    }

    /// @dev Use this function for encoding off-chain
    function action(
        address /*_sendToken*/,
        uint256 /*_sendAmount*/,
        address /*_feePayer*/
    )
        public
        payable
        virtual
    {
        require(
            address(this) != callStateContext,
            "ActionFeeHandler.action: Only delegatecall"
        );
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(bytes calldata _actionData, bytes calldata _taskState)
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        // 1. Decode Payload, if no taskState was present
        (IERC20 sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (IERC20, uint256, address)
        );

        // 2. Check if taskState exists
        if (_taskState.length != 0) {
            (ReturnType returnType, bytes memory _numBytes) = abi.decode(
                _taskState,
                (ReturnType, bytes)
            );
            if (returnType == ReturnType.UINT) {
                (sendAmount) = abi.decode(_numBytes, (uint256));
            } else if (returnType == ReturnType.UINT_AND_ERC20) {
                (sendAmount, sendToken) = abi.decode(_numBytes, (uint256, IERC20));
            }
        }

        IERC20 sendERC20 = IERC20(sendToken);
        uint256 fee = sendAmount.mul(feeNum).div(feeDen);
        if (address(this) == feePayer) sendERC20.safeTransfer(provider, fee);
        else sendERC20.safeTransferFrom(feePayer, provider, fee);

        return(ReturnType.UINT_AND_ERC20, abi.encodePacked(sendAmount.sub(fee), sendToken));
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (IERC20 sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (IERC20, uint256, address)
        );
        return termsOk(_userProxy, sendToken, sendAmount, feePayer);
    }

    function termsOk(
        address _userProxy,
        IERC20 _sendToken,
        uint256 _sendAmount,
        address _feePayer
    )
        public
        view
        virtual
        returns(string memory)
    {
        if (_sendAmount.mul(feeDen) < feeDen) return "ActionFeeHandler: Insufficient sendAmount";
        if (_userProxy == _feePayer) {
            try _sendToken.balanceOf(_userProxy) returns(uint256 balance) {
                if (balance < _sendAmount)
                    return "ActionFeeHandler: NotOkUserSendTokenBalance";
            } catch {
                return "ActionFeeHandler: ErrorBalanceOf";
            }
        } else {
            try _sendToken.allowance(_feePayer, _userProxy) returns(uint256 allowance) {
                if (allowance < _sendAmount)
                    return "ActionFeeHandler: NotOkUserProxySendTokenAllowance";
            } catch {
                return "ActionFeeHandler: ErrorAllowance";
            }
        }

        return OK;
    }
}
