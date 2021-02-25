// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IERC20} from "../../external/IERC20.sol";
import {IKyberNetworkProxy} from "../../dapp_interfaces/kyber/IKyberNetworkProxy.sol";

contract ActionKyberTrade is GelatoActionsStandardFull {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IKyberNetworkProxy public immutable KYBER;

    constructor(IKyberNetworkProxy _kyberNetworkProxy) public {
        KYBER =_kyberNetworkProxy;
    }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(
        address _origin,
        address _sendToken, // ERC20 or ETH (symbol)
        uint256 _sendAmount,
        address _receiveToken, // ERC20 or ETH (symbol)
        address _receiver
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _origin,
            _sendToken,
            _sendAmount,
            _receiveToken,
            _receiver
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

    function action(
        address _origin,
        address _sendToken, // ERC20 or ETH (symbol)
        uint256 _sendAmount,
        address _receiveToken,  // ERC20 or ETH (symbol)
        address _receiver
    )
        public
        virtual
        delegatecallOnly("ActionKyberTrade.action")
        returns (uint256 receiveAmount)
    {
        address receiver = _receiver == address(0) ? address(this) : _receiver;

        if (_sendToken == ETH_ADDRESS) {
            try KYBER.trade{value: _sendAmount}(
                _sendToken,
                _sendAmount,
                _receiveToken,
                receiver,
                type(uint256).max,  // maxDestAmount
                0,  // minConversionRate (if price condition, limit order still possible)
                0xe1F076849B781b1395Fd332dC1758Dbc129be6EC  // fee-sharing: gelato-node
            )
                returns(uint256 receiveAmt)
            {
                receiveAmount = receiveAmt;
            } catch {
                revert("ActionKyberTrade.action: trade with ETH Error");
            }
        } else {
            IERC20 sendERC20 = IERC20(_sendToken);

            // origin funds lightweight UserProxy
            if (_origin != address(0) && _origin != address(this)) {
                sendERC20.safeTransferFrom(
                    _origin, address(this), _sendAmount, "ActionKyberTrade.action:"
                );
            }

            // UserProxy approves KyberNetworkProxy
            sendERC20.safeIncreaseAllowance(
                address(KYBER), _sendAmount, "ActionKyberTrade.action:"
            );

            try KYBER.trade(
                _sendToken,
                _sendAmount,
                _receiveToken,
                receiver,
                type(uint256).max,  // maxDestAmount
                0,  // minConversionRate (if price condition, limit order still possible)
                0xe1F076849B781b1395Fd332dC1758Dbc129be6EC  // fee-sharing: gelato-node
            )
                returns(uint256 receiveAmt)
            {
                receiveAmount = receiveAmt;
            } catch {
                revert("ActionKyberTrade.action: trade with ERC20 Error");
            }
        }

        emit LogTwoWay(
            _origin,  // origin
            _sendToken,
            _sendAmount,
            address(KYBER),  // destination
            _receiveToken,
            receiveAmount,
            receiver
        );
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        address origin = abi.decode(_actionData[4:36], (address));
        (address receiveToken, address receiver) = abi.decode(
            _actionData[100:],
            (address,address)
        );
        (address sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (address,uint256));
        action(origin, sendToken, sendAmount, receiveToken, receiver);
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
        (address origin,  // 4:36
         address sendToken,  // 36:68
         uint256 sendAmount,  // 68:100
         address receiveToken,  // 100:132
         address receiver /* 132:164 */) = abi.decode(
             _actionData[4:],  // 0:4 == selector
             (address,address,uint256,address,address)
        );
        uint256 receiveAmount = action(origin, sendToken, sendAmount, receiveToken, receiver);
        return abi.encode(receiveToken, receiveAmount);
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
        address origin = abi.decode(_actionData[4:36], (address));
        (address receiveToken, address receiver) = abi.decode(
            _actionData[100:],
            (address,address)
        );
        (address sendToken, uint256 sendAmount) = abi.decode(_inFlowData, (address,uint256));
        uint256 receiveAmount = action(origin, sendToken, sendAmount, receiveToken, receiver);
        return abi.encode(receiveToken, receiveAmount);
    }

    // ====== ACTION TERMS CHECK ==========
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
            return "ActionKyberTrade: invalid action selector";

        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionKyberTrade: termsOk check invalidated by inbound DataFlow";

        (address origin,  // 4:36
         address sendToken,  // 36:68
         uint256 sendAmount,  // 68:100
         /*address receiveToken*/,  // 100:132
         address receiver) = abi.decode(
             _actionData[4:],  // 0:4 == selector
             (address,address,uint256,address,address)
        );

        // Safety for the next Action that consumes data from this Action
        if (_dataFlow == DataFlow.Out && _userProxy != receiver && address(0) != receiver)
            return "ActionKyberTrade: UserProxy must be receiver if DataFlow.Out";

        if (sendToken == ETH_ADDRESS) {
            if (origin != _userProxy && origin != address(0))
                return "ActionKyberTrade: MustHaveUserProxyOrZeroAsOriginForETHTrade";

            if (_userProxy.balance < sendAmount)
                return "ActionKyberTrade: NotOkUserProxyETHBalance";
        } else {
            IERC20 sendERC20 = IERC20(sendToken);

            // UserProxy is prefunded
            if (origin == _userProxy || origin == address(0)) {
                try sendERC20.balanceOf(_userProxy) returns(uint256 proxySendTokenBalance) {
                    if (proxySendTokenBalance < sendAmount)
                        return "ActionKyberTrade: NotOkUserProxySendTokenBalance";
                } catch {
                    return "ActionKyberTrade: ErrorBalanceOf-1";
                }
            } else {
                // UserProxy is not prefunded
                try sendERC20.balanceOf(origin) returns(uint256 originSendTokenBalance) {
                    if (originSendTokenBalance < sendAmount)
                        return "ActionKyberTrade: NotOkOriginSendTokenBalance";
                } catch {
                    return "ActionKyberTrade: ErrorBalanceOf-2";
                }

                try sendERC20.allowance(origin, _userProxy)
                    returns(uint256 userProxySendTokenAllowance)
                {
                    if (userProxySendTokenAllowance < sendAmount)
                        return "ActionKyberTrade: NotOkUserProxySendTokenAllowance";
                } catch {
                    return "ActionKyberTrade: ErrorAllowance";
                }
            }
        }

        // Make sure Trading Pair is valid
        // @DEV we don't do this as this check is very expensive
        // However, by chaining another action that inspects this data before this
        // one, the same check can likely be made in a cheaper way. E.g.
        // a Provider Action that inspects whether sendToken/receiveToken is
        // on a custom whitelist.
        // try KYBER.getExpectedRate(sendToken, receiveToken, sendAmount)
        //     returns (uint256 expectedRate, uint256)
        // {
        //     if (expectedRate == 0) return "ActionKyberTrade:noReserve";
        // } catch {
        //     return "ActionKyberTrade:getExpectedRate-Error";
        // }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
