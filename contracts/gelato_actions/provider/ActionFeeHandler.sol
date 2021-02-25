// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../external/IERC20.sol";
import {Address} from "../../external/Address.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
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

    constructor(
        address payable _provider,
        FeeHandlerFactory _feeHandlerFactory,
        uint256 _num,
        uint256 _den
    )
        public
    {
        require(_num <= _den, "ActionFeeHandler.constructor: _num greater than _den");
        provider = _provider;
        feeHandlerFactory = _feeHandlerFactory;
        feeNum = _num;
        feeDen = _den;
    }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(address _sendToken, uint256 _sendAmount, address _feePayer)
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(this.action.selector, _sendToken, _sendAmount, _feePayer);
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_IN_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_OUT_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    function isTokenWhitelisted(address _token) public view returns(bool) {
        return feeHandlerFactory.isWhitelistedToken(provider, _token);
    }

    // ======= ACTION IMPLEMENTATION DETAILS =========
    /// @dev Use this function for encoding off-chain. DelegatecallOnly!
    function action(address _sendToken, uint256 _sendAmount, address _feePayer)
        public
        virtual
        delegatecallOnly("ActionFeeHandler.action")
        returns (uint256 sendAmountAfterFee)
    {
        uint256 fee = _sendAmount.mul(feeNum).sub(1) / feeDen + 1;
        if (address(this) == _feePayer) {
            if (_sendToken == ETH_ADDRESS) provider.sendValue(fee);
            else IERC20(_sendToken).safeTransfer(provider, fee, "ActionFeeHandler.action:");
        } else {
        IERC20(_sendToken).safeTransferFrom(
            _feePayer, provider, fee, "ActionFeeHandler.action:"
        );
        }
        sendAmountAfterFee = _sendAmount.sub(fee);
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
        address feePayer = abi.decode(_actionData[68:], (address));
        action(sendToken, sendAmount, feePayer);
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
        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );
        uint256 sendAmountAfterFee = action(sendToken, sendAmount, feePayer);
        return abi.encode(sendToken, sendAmountAfterFee);
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
        address feePayer = abi.decode(_actionData[68:], (address));
        uint256 sendAmountAfterFee = action(sendToken, sendAmount, feePayer);
        return abi.encode(sendToken, sendAmountAfterFee);
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
            return "ActionFeeHandler: invalid action selector";

        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionFeeHandler: termsOk check invalidated by inbound DataFlow";

        (address sendToken, uint256 sendAmount, address feePayer) = abi.decode(
            _actionData[4:],
            (address,uint256,address)
        );

        if (sendAmount == 0)
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
}

contract FeeHandlerFactory {

    event Created(
        address indexed provider,
        ActionFeeHandler indexed feeHandler,
        uint256 indexed num
    );

    // Denominator => For a fee of 1% => Input num = 100, as 100 / 10.000 = 0.01 == 1%
    uint256 public constant DEN = 10000;

    // provider => num => ActionFeeHandler
    mapping(address => mapping(uint256 => ActionFeeHandler)) public feeHandlerByProviderAndNum;
    mapping(address => ActionFeeHandler[]) public feeHandlersByProvider;
    mapping(address => mapping(address => bool)) public isWhitelistedToken;

    /// @notice Deploys a new feeHandler instance
    /// @dev Input _num = 100 for 1% fee, _num = 50 for 0.5% fee, etc
    function create(uint256 _num) public returns (ActionFeeHandler feeHandler) {
        require(
            feeHandlerByProviderAndNum[msg.sender][_num] == ActionFeeHandler(0),
            "FeeHandlerFactory.create: already deployed"
        );
        require(_num <= DEN, "FeeHandlerFactory.create: num greater than DEN");
        feeHandler = new ActionFeeHandler(msg.sender, this, _num, DEN);
        feeHandlerByProviderAndNum[msg.sender][_num] = feeHandler;
        feeHandlersByProvider[msg.sender].push(feeHandler);
        emit Created(msg.sender, feeHandler, _num);
    }

    // Provider Token whitelist
    function addTokensToWhitelist(address[] calldata _tokens) external {
        for (uint i; i < _tokens.length; i++) {
            isWhitelistedToken[msg.sender][_tokens[i]] = true;
        }
    }

    function removeTokensFromWhitelist(address[] calldata _tokens) external {
        for (uint i; i < _tokens.length; i++) {
            isWhitelistedToken[msg.sender][_tokens[i]] = false;
        }
    }
}
