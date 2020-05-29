// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";
import { SafeMath } from '../../external/SafeMath.sol';

contract FeeHandler is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address payable;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct Fee {
        uint256 num;
        uint256 den;
    }

    address public immutable myself;
    address payable public immutable provider;
    uint256 public immutable feeNum;
    uint256 public immutable feeDen;

    constructor(address payable _provider, uint256 _num, uint256 _den) public {
        myself = address(this);
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
        require(myself != address(this), "Only delegatecall");
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(
        bytes calldata _actionData,
        bytes calldata _taskState
    )
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        // 1. Decode Payload, if no taskState was present
        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(_actionData[4:], (address, uint256, address));

        // 2. Check if taskState exists
        if (_taskState.length != 0) {
            (ReturnType returnType, bytes memory _numBytes) = abi.decode(_taskState, (ReturnType, bytes));
            if (returnType == ReturnType.UINT)
                (sendAmount) = abi.decode(_numBytes, (uint256));
            else if (returnType == ReturnType.UINT_AND_ERC20)
                (sendAmount, sendToken) = abi.decode(_numBytes, (uint256, address));

        }

        IERC20 sendERC20 = IERC20(sendToken);

        uint256 fee = sendAmount.mul(feeNum).div(feeDen, "FeeHanlder.gelatoInternal: Underflow");

        if (address(this) == feePayer) {
            if (sendToken == ETH_ADDRESS)
                provider.sendValue(fee);
            else
                sendERC20.safeTransfer(provider, fee);
        } else sendERC20.safeTransferFrom(feePayer, provider, fee);

        return(ReturnType.UINT_AND_ERC20, abi.encode(sendAmount.sub(fee), sendToken));
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
        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(_actionData[4:], (address, uint256, address));
        return termsOk(_userProxy, sendToken, sendAmount, feePayer);
    }

    function termsOk(
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount,
        address _feePayer
    )
        public
        view
        virtual
        returns(string memory)
    {
        if (_sendAmount.mul(feeDen) < feeDen)
            return "FeeHandler: Insufficient sendAmount, will underflow";

        IERC20 sendERC20 = IERC20(_sendToken);

        if (_userProxy == _feePayer) {
            if (_sendToken == ETH_ADDRESS) {
                if(_userProxy.balance < _sendAmount)
                    return "FeeHandler: NotOkUserETHBalance";
            } else {
                try sendERC20.balanceOf(_userProxy) returns(uint256 balance) {
                    if (balance < _sendAmount)
                        return "FeeHandler: NotOkUserSendTokenBalance";
                } catch {
                    return "FeeHandler: ErrorBalanceOf";
                }
            }
        } else {
            if (_sendToken == ETH_ADDRESS)
                return "FeeHandler: CannotTransferFromETH";
            try sendERC20.allowance(_feePayer, _userProxy) returns(uint256 allowance) {
                if (allowance < _sendAmount)
                    return "FeeHandler: NotOkUserProxySendTokenAllowance";
            } catch {
                return "FeeHandler: ErrorAllowance";
            }
        }
        return OK;
    }
}

contract FeeHandlerFactory {

    event Created(address indexed provider, address indexed feeHandler, uint256 indexed numerator);

    // Denominator => For a fee of 1% => Input num = 100, as 100 / 10.000 = 0.01 == 1%
    uint256 public constant DEN = 10000;

    mapping(address=>bool) public isFeeHandler;
    mapping(address => mapping(uint256 => address)) internal _feeHandlers;

    // deploys a new feeHandler instance
    /// @dev Input _num = 100 for 1% fee, _num = 50 for 0.5% fee, etc
    function create(uint256 _num) public returns (address feeHandler) {
        feeHandler = create(msg.sender, _num);
    }

    // deploys a new feeHandler instance
    // sets custom provider of feeHandler
    function create(address payable _provider, uint256 _num) private returns (address feeHandler) {
        feeHandler = address(new FeeHandler(_provider, _num, DEN));
        isFeeHandler[feeHandler] = true;
        addNewFeeHandler(feeHandler, _provider, _num);
    }

    function getFeeHandler(address _provider, uint256 _num)
        public
        view
        returns(address feeHandler)
    {
        feeHandler = _feeHandlers[_provider][_num];
    }

    function addNewFeeHandler(
        address _feeHandler,
        address _provider,
        uint256 _num
    )
        private
    {
        require(_feeHandlers[_provider][_num] == address(0), "Fee contract already deployed");
        _feeHandlers[_provider][_num] = _feeHandler;
        emit Created(_provider, _feeHandler, _num);
    }

}
