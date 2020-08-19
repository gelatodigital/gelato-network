// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IERC20} from "../../external/IERC20.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IGelatoSysAdmin} from "../../gelato_core/interfaces/IGelatoSysAdmin.sol";
import {IConditionalTokens, IERC1155, IFixedProductMarketMaker} from "../../dapp_interfaces/conditional_tokens/IConditionalTokens.sol";
import {IGasPriceOracle} from "../../dapp_interfaces/chainlink/IGasPriceOracle.sol";
import {GelatoActionsStandard} from "../GelatoActionsStandard.sol";
import {IUniswapV2Router02} from "../../dapp_interfaces/uniswap_v2/IUniswapV2.sol";

/// @title ActionWithdrawLiquidity
/// @author Hilmar Orth
/// @notice Gelato Action that
///  1) withdraws conditional tokens from FPMM
///  2) merges position on conditional tokens contract
///  3) transfers merged tokens back to user
contract ActionWithdrawLiquidity is GelatoActionsStandard {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event LogWithdrawSuccess(uint256 indexed withdrawAmount, uint256 indexed fee);

    IGelatoSysAdmin immutable public gelatoCore;
    address immutable public provider;
    IERC20 public immutable WETH;
    uint256 constant public OVERHEAD = 180000;
    IUniswapV2Router02 public immutable uniRouter;

    constructor(IGelatoSysAdmin _gelatoCore, address _provider, IERC20 _WETH, IUniswapV2Router02 _uniRouter) public {
        gelatoCore = _gelatoCore;
        provider = _provider;
        WETH = _WETH;
        uniRouter = _uniRouter;
    }

    // ======= ACTION IMPLEMENTATION DETAILS =========
    function action(
        IConditionalTokens _conditionalTokens,
        IFixedProductMarketMaker _fixedProductMarketMaker,
        uint256[] memory _positionIds,
        bytes32 _conditionId,
        bytes32 _parentCollectionId,
        address _collateralToken,
        address _receiver
    )
        public
        virtual
    {
        uint256 startGas = gasleft();

        require(_positionIds.length > 0, "ActionWithdrawLiquidity: Position Ids must be at least of length 1");

        // 1. Fetch the balance of liquidity pool tokens
        uint256 lpTokensToWithdraw = IERC20(address(_fixedProductMarketMaker)).balanceOf(address(this));

        require(lpTokensToWithdraw > 0, "ActionWithdrawLiquidity: No LP tokens to withdraw");

        // 2. Fetch Current collateral token balance to know how much the proxy already has
        // And avoid more state reads by calling feesWithdrawablyBy
        uint256 collateralTokenBalancePre = IERC20(_collateralToken).balanceOf(address(this));

        // 3. Remove funding from fixedProductMarketMaker
        _fixedProductMarketMaker.removeFunding(lpTokensToWithdraw);

        // 4. Check balances of conditional tokens
        address[] memory proxyAddresses = new address[](_positionIds.length);
        for (uint256 i; i < _positionIds.length; i++) {
            proxyAddresses[i] = address(this);
        }

        uint256[] memory outcomeTokenBalances = IERC1155(address(_conditionalTokens)).balanceOfBatch(proxyAddresses, _positionIds);

        // 5. Find the lowest balance of all outcome tokens
        uint256 amountToMerge = outcomeTokenBalances[0];
        for (uint256 i = 1; i < outcomeTokenBalances.length; i++) {
            uint256 outcomeTokenBalance = outcomeTokenBalances[i];
            if (outcomeTokenBalance < amountToMerge) amountToMerge = outcomeTokenBalance;
        }

        require(amountToMerge > 0, "ActionWithdrawLiquidity: No outcome tokens to merge");

        uint256[] memory partition = new uint256[](_positionIds.length);
        for (uint256 i; i < partition.length; i++) {
            partition[i] = 1 << i;
        }

        // 6. Merge outcome tokens
        _conditionalTokens.mergePositions(IERC20(_collateralToken), _parentCollectionId, _conditionId, partition, amountToMerge);


        // 7. Calculate exactly how many collateral tokens were recevied
        uint256 collateralTokensReceived = IERC20(_collateralToken).balanceOf(address(this)).sub(collateralTokenBalancePre);


        // 8. Calculate how much this action consumed
        uint256 ethToBeRefunded = startGas.add(OVERHEAD).sub(gasleft()).mul(fetchCurrentGasPrice());

        // 9. Calculate how much of the collateral token needs be refunded to the provider
        uint256 collateralTokenFee;
        if (address(WETH) == _collateralToken) collateralTokenFee = ethToBeRefunded;
        else collateralTokenFee = getUniswapRate(address(WETH), ethToBeRefunded, _collateralToken);

        require(collateralTokenFee <= collateralTokensReceived, "ActionWithdrawLiquidity: Insufficient Collateral to pay for withdraw transaction");

        // 10. Transfer received collateral minus Fee back to user
        IERC20(_collateralToken).safeTransfer(_receiver, collateralTokensReceived - collateralTokenFee, "Transfer Collateral to receiver failed");

        // 11. Transfer Fee back to provider
        IERC20(_collateralToken).safeTransfer(provider, collateralTokenFee, "Transfer Collateral to receiver failed");

        emit LogWithdrawSuccess(collateralTokensReceived - collateralTokenFee, collateralTokenFee);

    }

    function fetchCurrentGasPrice() public view returns(uint256) {
        return uint256(IGasPriceOracle(gelatoCore.gelatoGasPriceOracle()).latestAnswer());
    }

    function getUniswapRate(address _sellToken, uint256 _amountIn, address _buyToken)
        public
        view
        returns(uint256 expectedRate)
    {
        address[] memory tokenPath = getPaths(_sellToken, _buyToken);

        try uniRouter.getAmountsOut(_amountIn, tokenPath)
            returns (uint[] memory expectedRates) {
            expectedRate = expectedRates[1];
        } catch {
            revert("UniswapV2GetExpectedRateError");
        }
    }

    function getPaths(address _sellToken, address _buyToken)
        internal pure returns(address[] memory paths)
    {
        paths = new address[](2);
        paths[0] = _sellToken;
        paths[1] = _buyToken;
    }


}