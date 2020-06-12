// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {Address} from "../../external/Address.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {IERC20} from "../../external/IERC20.sol";
import {IUniswapExchange} from "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import {IUniswapFactory} from "../../dapp_interfaces/uniswap/IUniswapFactory.sol";

contract ActionUniswapTrade is GelatoActionsStandardFull {
    using Address for address;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IUniswapFactory public immutable UNI_FACTORY;

    constructor(IUniswapFactory _uniswapFactory) public {
        UNI_FACTORY =_uniswapFactory;
    }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(
        address _origin,
        address _sendToken, // exchange
        uint256 _sendAmount, // tokens_sold
        address _receiveToken, // token_addr
        address _receiver
    )
        public
        pure
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

    // ======= ACTION IMPLEMENTATION DETAILS =========
    /// @dev Always use this function for encoding _actionData off-chain
    ///  Will be called by GelatoActionPipeline if Action.dataFlow.None
    function action(
        address _origin,
        address _sendToken, // exchange
        uint256 _sendAmount, // tokens_sold
        address _receiveToken, // token_addr
        address _receiver
    )
        public
        virtual
        delegatecallOnly("ActionUniswapTrade.action")
        returns (uint256 receiveAmount)
    {
        IUniswapExchange sendTokenExchange;

        // If sendToken is not ETH
        if (_sendToken == ETH_ADDRESS) {
           receiveAmount = _swapEthToToken(_sendAmount, IERC20(_receiveToken), _receiver);
        } else {
            IERC20 sendERC20 = IERC20(_sendToken);
            sendTokenExchange = UNI_FACTORY.getExchange(IERC20(sendERC20));

            if (sendTokenExchange != IUniswapExchange(0)) {

                // origin funds lightweight proxy
                if (_origin != address(0) && _origin != address(this)) {
                    sendERC20.safeTransferFrom(_origin, address(this), _sendAmount);
                }

                // proxy approves Uniswap
                try sendERC20.approve(address(sendTokenExchange), _sendAmount) {
                } catch {
                    revert("ActionUniswapTrade.action: approve sendTokenExchange");
                }

                if (_receiveToken == ETH_ADDRESS) {
                    receiveAmount = _swapTokenToEth(
                        sendTokenExchange,
                        _sendAmount,
                        _receiver
                    );
                } else {
                    receiveAmount = _swapTokenToToken(
                        sendTokenExchange,
                        _sendAmount,
                        IERC20(_receiveToken),
                        _receiver
                    );
                }
            } else {
                revert("ActionUniswapTrade: Invalid SendTokenExchange");
            }
        }

        emit LogTwoWay(
            _origin,  // origin
            _sendToken,
            _sendAmount,
            address(sendTokenExchange),  // destination
            _receiveToken,
            receiveAmount,
            _receiver
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
            return "ActionUniswapTrade: invalid action selector";

        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionUniswapTrade: termsOk check invalidated by inbound DataFlow";

        (address origin,  // 4:36
         address sendToken,  // 36:68
         uint256 sendAmount,  // 68:100
         address receiveToken,  // 100:132
          /* _receiver 132:164 */) = abi.decode(
             _actionData[4:],  // 0:4 == selector
             (address,address,uint256,address,address)
        );

        if (sendToken == ETH_ADDRESS) {
            IERC20 receiveERC20 = IERC20(receiveToken);
            IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(receiveERC20);
            if (receiveTokenExchange == IUniswapExchange(0))
                return "ActionUniswapTrade: receiveTokenExchangeDoesNotExist-1";

            if (_userProxy.balance < sendAmount)
                return "ActionUniswapTrade: NotOkUserProxyETHBalance";
        } else {
            IERC20 sendERC20 = IERC20(sendToken);
            IUniswapExchange sendTokenExchange = UNI_FACTORY.getExchange(sendERC20);

            if (sendTokenExchange == IUniswapExchange(0))
                return "ActionUniswapTrade: sendTokenExchangeDoesNotExist";

            if (receiveToken != ETH_ADDRESS) {
                IERC20 receiveERC20 = IERC20(receiveToken);
                IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(receiveERC20);
                if (receiveTokenExchange == IUniswapExchange(0))
                    return "ActionUniswapTrade: receiveTokenExchangeDoesNotExist-2";
            }

            // UserProxy is prefunded
            if (origin == address(0) || origin == _userProxy) {
                try sendERC20.balanceOf(_userProxy) returns(uint256 proxySendTokenBalance) {
                    if (proxySendTokenBalance < sendAmount)
                        return "ActionUniswapTrade: NotOkUserProxySendTokenBalance";
                } catch {
                    return "ActionUniswapTrade: ErrorBalanceOf-1";
                }
            } else {
                // UserProxy is not prefunded
                try sendERC20.balanceOf(origin) returns(uint256 originSendTokenBalance) {
                    if (originSendTokenBalance < sendAmount)
                        return "ActionUniswapTrade: NotOkOriginSendTokenBalance";
                } catch {
                    return "ActionUniswapTrade: ErrorBalanceOf-2";
                }

                try sendERC20.allowance(origin, _userProxy)
                    returns(uint256 userProxySendTokenAllowance)
                {
                    if (userProxySendTokenAllowance < sendAmount)
                        return "ActionUniswapTrade: NotOkUserProxySendTokenAllowance";
                } catch {
                    return "ActionUniswapTrade: ErrorAllowance";
                }
            }
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }

    // ========== ACTION HELPERS ===========
    function _swapEthToToken(uint256 _sendAmount, IERC20 _receiveToken, address _receiver)
        internal
        virtual
        returns (uint256 receiveAmount)
    {
        IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(_receiveToken);
        if (receiveTokenExchange != IUniswapExchange(0)) {
            try receiveTokenExchange.ethToTokenTransferInput{value: _sendAmount}(
                1,
                block.timestamp,
                _receiver
            )
                returns (uint256 receiveTokenAmount)
            {
                receiveAmount = receiveTokenAmount;
            } catch {
                revert("ActionUniswapTrade._swapEthToToken: ethToTokenTransferInput");
            }
        } else {
            revert("ActionUniswapTrade._swapEthToToken: Invalid ReceiveTokenExchange");
        }
    }

    function _swapTokenToEth(
        IUniswapExchange sendTokenExchange,
        uint256 _sendAmount,
        address _receiver
    )
        internal
        virtual
        returns (uint256 receiveAmountETH)
    {
        try sendTokenExchange.tokenToEthTransferInput(
            _sendAmount,
            1,
            block.timestamp,
            _receiver
        )
            returns (uint256 receivedETH)
        {
            receiveAmountETH = receivedETH;
        } catch {
            revert("ActionUniswapTrade._swapTokenToEth: tokenToEthTransferInput");
        }
    }

    function _swapTokenToToken(
        IUniswapExchange sendTokenExchange,
        uint256 _sendAmount,
        IERC20 _receiveToken,
        address _receiver
    )
        internal
        virtual
        returns (uint256 receiveAmountToken)
    {
        IUniswapExchange receiveTokenExchange = UNI_FACTORY.getExchange(_receiveToken);
        if (receiveTokenExchange != IUniswapExchange(0)) {
            try sendTokenExchange.tokenToTokenTransferInput(
                _sendAmount,
                1,
                1,
                block.timestamp,
                _receiver,
                address(_receiveToken)
            )
                returns (uint256 receivedTokens)
            {
                receiveAmountToken = receivedTokens;
            } catch {
                revert("ActionUniswapTrade._swapTokenToToken");
            }
        } else {
            revert("ActionUniswapTrade._swapTokenToToken: Invalid ReceiveTokenExchange");
        }
    }
}
