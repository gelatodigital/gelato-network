// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {IGelatoInFlowAction} from "../action_pipeline_interfaces/IGelatoInFlowAction.sol";
import {GelatoActionsStandard} from "../GelatoActionsStandard.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IERC20} from "../../external/IERC20.sol";
import {Address} from "../../external/Address.sol";

import {IUniswapV2Router02, IUniswapV2Factory, IWETH} from "../../dapp_interfaces/uniswap_v2/IUniswapV2.sol";


contract ActionUniswapV2Trade is GelatoActionsStandard, IGelatoInFlowAction {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address payable;

    IUniswapV2Router02 public immutable uniRouter;
    IUniswapV2Factory public immutable uniFactory;
    IWETH public immutable WETH;

    event LogGelatoUniswapTrade(
        address indexed sellToken,
        uint256 indexed sellAmount,
        address indexed buyToken,
        uint256 minBuyAmount,
        uint256 buyAmount,
        address receiver,
        address origin
    );

    constructor(
        IUniswapV2Router02 _uniswapV2Router,
        IUniswapV2Factory _uniswapV2Factory,
        IWETH _weth
    ) public {
        uniRouter = _uniswapV2Router;
        uniFactory = _uniswapV2Factory;
        WETH = _weth;
    }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        uint256 _minBuyAmount,
        address _receiver,
        address _origin
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _sellToken,
            _sellAmount,
            _buyToken,
            _minBuyAmount,
            _receiver,
            _origin
        );
    }

    function action(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        uint256 _minBuyAmount,
        address _receiver,
        address _origin
    )
        public
        virtual
        delegatecallOnly("ActionKyberTrade.action")
    {
        address receiver = _receiver == address(0) ? address(this) : _receiver;

        address buyToken = _buyToken;

        // If sellToken == ETH, wrap ETH to WETH
        // IF ETH, we assume the proxy already has ETH and we dont transferFrom it
        if (_sellToken == ETH_ADDRESS) {
            _sellToken = address(WETH);
            WETH.deposit{value: _sellAmount}();
        } else {
            if (_origin != address(0) && _origin != address(this)) {
                IERC20(_sellToken).safeTransferFrom(
                    _origin, address(this), _sellAmount, "ActionUniswapV2Trade.safeTransferFrom"
                );
            }
        }

        IERC20 sellToken = IERC20(_sellToken);

        // Uniswap only knows WETH
        if(_buyToken == ETH_ADDRESS) buyToken = address(WETH);

        address[] memory tokenPath = getPaths(_sellToken, buyToken);

        // UserProxy approves Uniswap Router
        sellToken.safeIncreaseAllowance(
            address(uniRouter), _sellAmount, "ActionUniswapV2Trade.safeIncreaseAllowance"
        );

        uint256 buyAmount;
        try uniRouter.swapExactTokensForTokens(
            _sellAmount,
            _minBuyAmount,
            tokenPath,
            address(this),
            now + 1
        ) returns (uint256[] memory buyAmounts) {
            buyAmount = buyAmounts[1];
        } catch {
            revert("ActionUniswapV2Trade.action: trade with ERC20 Error");
        }


        // If buyToken == ETH, unwrap WETH to ETH
        if (_buyToken == ETH_ADDRESS) {
            WETH.withdraw(buyAmount);
            if (receiver != address(this)) payable(receiver).sendValue(buyAmount);
        } else if (receiver != address(this)) IERC20(_buyToken).safeTransfer(receiver, buyAmount, "ActionUniswapV2Trade.safeTransfer");

        emit LogGelatoUniswapTrade(
            _sellToken,
            _sellAmount,
            _buyToken,
            _minBuyAmount,
            buyAmount,
            receiver,
            _origin
        );
    }

    function getPaths(address _sellToken, address _buyToken)
        internal pure returns(address[] memory paths)
    {
        paths = new address[](2);
        paths[0] = _sellToken;
        paths[1] = _buyToken;
    }

    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow,
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
            return "ActionUniswapV2Trade: invalid action selector";

        (address _sellToken,
         uint256 _sellAmount,
         address _buyToken,
         ,
         ,
         address _origin) = abi.decode(
             _actionData[4:],  // 0:4 == selector
             (address,uint256,address,uint256,address,address)
        );

        if (_sellToken == ETH_ADDRESS) _sellToken = address(WETH);
        if (_buyToken == ETH_ADDRESS) _buyToken = address(WETH);

        if (!checkPair(_sellToken, _buyToken)) return "ActionUniswapV2Trade: Token Pair no listed on Uniswap";

        if (_sellToken == ETH_ADDRESS) {
            if (_origin != _userProxy && _origin != address(0))
                return "ActionUniswapV2Trade: MustHaveUserProxyOrZeroAsOriginForETHTrade";

            if (_userProxy.balance < _sellAmount)
                return "ActionUniswapV2Trade: NotOkUserProxyETHBalance";
        } else {
            IERC20 sendERC20 = IERC20(_sellToken);

            // UserProxy is prefunded
            if (_origin == _userProxy || _origin == address(0)) {
                try sendERC20.balanceOf(_userProxy) returns(uint256 proxySendTokenBalance) {
                    if (proxySendTokenBalance < _sellAmount)
                        return "ActionUniswapV2Trade: NotOkUserProxySendTokenBalance";
                } catch {
                    return "ActionUniswapV2Trade: ErrorBalanceOf-1";
                }
            } else {
                // UserProxy is not prefunded
                try sendERC20.balanceOf(_origin) returns(uint256 originSendTokenBalance) {
                    if (originSendTokenBalance < _sellAmount)
                        return "ActionUniswapV2Trade: NotOkOriginSendTokenBalance";
                } catch {
                    return "ActionUniswapV2Trade: ErrorBalanceOf-2";
                }

                try sendERC20.allowance(_origin, _userProxy)
                    returns(uint256 userProxySendTokenAllowance)
                {
                    if (userProxySendTokenAllowance < _sellAmount)
                        return "ActionUniswapV2Trade: NotOkUserProxySendTokenAllowance";
                } catch {
                    return "ActionUniswapV2Trade: ErrorAllowance";
                }
            }
        }

        return OK;
    }

    function checkPair(address _sellToken, address _buyToken) internal view returns(bool pairValid) {
        address pair = uniFactory.getPair(_sellToken, _buyToken);
        if( pair != address(0)) pairValid = true;
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_IN_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address _buyToken,
         uint256 _minBuyAmount,
         address _receiver,
         address _origin) = abi.decode(
             _actionData[68:],  // 0:4 == selector
             (address,uint256,address,address)
        );
        (address sellToken, uint256 sellAmount) = abi.decode(_inFlowData, (address,uint256));
        action(sellToken, sellAmount, _buyToken, _minBuyAmount, _receiver, _origin);
    }


}