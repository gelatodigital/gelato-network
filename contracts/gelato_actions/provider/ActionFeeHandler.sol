// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {DataFlowType} from "../action_pipeline_interfaces/DataFlowType.sol";
import {IERC20} from "../../external/IERC20.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {Address} from "../../external/Address.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {Ownable} from "../../external/Ownable.sol";

contract ActionFeeHandler is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address payable;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address payable public immutable provider;
    FeeHandlerFactory public immutable feeHandlerFactory;
    uint256 public immutable feeNum;
    uint256 public immutable feeDen;

    mapping(address => bool) public isCustomWhitelistedToken;
    bool public useCustomWhitelist;

    constructor(
        address payable _provider,
        FeeHandlerFactory _feeHandlerFactory,
        uint256 _num,
        uint256 _den
    )
        public
    {
        provider = _provider;
        feeHandlerFactory = _feeHandlerFactory;
        feeNum = _num;
        feeDen = _den;
    }

    modifier onlyProvider() {
        require(msg.sender == provider, "ActionFeeHandler.onlyProvider");
        _;
    }

    // ======= FEE HANDLER CUSTOM ADMIN =========
    function addTokenToCustomWhitelist(address _token) external onlyProvider {
        isCustomWhitelistedToken[_token] = true;
    }

    function removeTokenFromCustomWhitelist(address _token) external onlyProvider {
        isCustomWhitelistedToken[_token] = false;
    }

    function activateCustomWhitelist() external onlyProvider {
        useCustomWhitelist = true;
    }

    function deactivateCustomWhitelist() external onlyProvider {
        useCustomWhitelist = false;
    }

    function isTokenWhitelisted(address _token) public view returns(bool) {
        if (useCustomWhitelist) return isCustomWhitelistedToken[_token];
        return feeHandlerFactory.isWhitelistedToken(_token);
    }

    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(address _sendToken, uint256 _sendAmount, address _feePayer)
        public
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSelector(this.action.selector, _sendToken, _sendAmount, _feePayer);
    }

    /// @dev Use this function for encoding off-chain. DelegatecallOnly!
    function action(address _sendToken, uint256 _sendAmount, address _feePayer)
        public
        virtual
        delegatecallOnly("ActionFeeHandler.action")
        returns (uint256 sendAmountAfterFee)
    {
        uint256 fee = _sendAmount.mul(feeNum).div(feeDen);
        if (address(this) == _feePayer) {
            if (_sendToken == ETH_ADDRESS) provider.sendValue(fee);
            else IERC20(_sendToken).safeTransfer(provider, fee);
        } else {
            IERC20(_sendToken).safeTransferFrom(_feePayer, provider, fee);
        }
        sendAmountAfterFee = _sendAmount.sub(fee);
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address sendToken, uint256 sendAmount) = _handleInFlowData(_inFlowData);
        address feePayer = _extractReusableActionData(_actionData);
        action(sendToken, sendAmount, feePayer);
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
        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );
        uint256 sendAmountAfterFee = action(sendToken, sendAmount, feePayer);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(sendToken, sendAmountAfterFee));
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
        address feePayer = _extractReusableActionData(_actionData);
        uint256 sendAmountAfterFee = action(sendToken, sendAmount, feePayer);
        return (DataFlowType.TOKEN_AND_UINT256, abi.encode(sendToken, sendAmountAfterFee));
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
        returns(string memory)  // actionTermsOk
    {
        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionFeeHandler: termsOk check invalidated by inbound DataFlow";

        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );

        if (sendAmount.mul(feeNum) < feeDen)
            return "ActionFeeHandler: Insufficient sendAmount";

        if (!isTokenWhitelisted(sendToken))
            return "ActionFeeHandler: Token not whitelisted for fee";

        IERC20 sendERC20 = IERC20(sendToken);

        if (_userProxy == feePayer) {
            if (sendToken == ETH_ADDRESS) {
                if (_userProxy.balance < sendAmount)
                    return "ActionFeeHandler: NotOkUserProxyETHBalance";
            } else {
                try sendERC20.balanceOf(_userProxy) returns (uint256 balance) {
                    if (balance < sendAmount)
                        return "ActionFeeHandler: NotOkUserProxySendTokenBalance";
                } catch {
                    return "ActionFeeHandler: ErrorBalanceOf";
                }
            }
        } else {
            if (sendToken == ETH_ADDRESS)
                return "ActionFeeHandler: CannotTransferFromETH";
            try sendERC20.balanceOf(feePayer) returns (uint256 balance) {
                    if (balance < sendAmount)
                        return "ActionFeeHandler: NotOkFeePayerSendTokenBalance";
                } catch {
                    return "ActionFeeHandler: ErrorBalanceOf";
                }
            try sendERC20.allowance(feePayer, _userProxy) returns (uint256 allowance) {
                if (allowance < sendAmount)
                    return "ActionFeeHandler: NotOkFeePayerSendTokenAllowance";
            } catch {
                return "ActionFeeHandler: ErrorAllowance";
            }
        }

        return OK;
    }

    // ======= ACTION HELPERS =========
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
            (sendToken, sendAmount) = abi.decode(inFlowData, (address,uint256));
        else revert("ActionFeeHandler._handleInFlowData: invalid inFlowDataType");
    }

    function _extractReusableActionData(bytes calldata _actionData)
        internal
        pure
        virtual
        returns(address feePayer)
    {
        feePayer = abi.decode(_actionData[68:], (address));
    }
}

contract FeeHandlerFactory is Ownable {

    event Created(
        address indexed provider,
        ActionFeeHandler indexed feeHandler,
        uint256 indexed num
    );

    // Denominator => For a fee of 1% => Input num = 100, as 100 / 10.000 = 0.01 == 1%
    uint256 public constant DEN = 10000;

    // provider => num => ActionFeeHandler
    mapping(address => mapping(uint256 => ActionFeeHandler)) public feeHandlerByProviderAndNum;
    mapping(address => bool) public isFeeHandler;
    mapping(address => bool) public isWhitelistedToken;

    /// @notice Deploys a new feeHandler instance
    /// @dev Input _num = 100 for 1% fee, _num = 50 for 0.5% fee, etc
    function create(uint256 _num) public returns (ActionFeeHandler feeHandler) {
        require(
            feeHandlerByProviderAndNum[msg.sender][_num] == ActionFeeHandler(0),
            "FeeHandlerFactory.create: already deployed"
        );
        feeHandler = new ActionFeeHandler(msg.sender, this, _num, DEN);
        feeHandlerByProviderAndNum[msg.sender][_num] = feeHandler;
        isFeeHandler[address(feeHandler)] = true;
        emit Created(msg.sender, feeHandler, _num);
    }

    // Fee Factory Admin
    function addTokenToWhitelist(address _token) external onlyOwner {
        isWhitelistedToken[_token] = true;
    }

    function removeTokenFromWhitelist(address _token) external onlyOwner {
        isWhitelistedToken[_token] = false;
    }
}
