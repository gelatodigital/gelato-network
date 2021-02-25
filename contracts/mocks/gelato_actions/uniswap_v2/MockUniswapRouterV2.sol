// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {GelatoActionsStandard} from "../../../gelato_actions/GelatoActionsStandard.sol";
import {SafeERC20} from "../../../external/SafeERC20.sol";
import {IERC20} from "../../../external/IERC20.sol";

contract MockUniswapRouterV2 {

    using SafeERC20 for IERC20;


    function getPaths(address _sellToken, address _buyToken) public pure returns(address[] memory tokenPath) {
        tokenPath = new address[](2);
        tokenPath[0] = _sellToken;
        tokenPath[1] = _buyToken;
    }

    function getAmountsIn(uint256 _buyAmount, address[] memory) public pure returns (uint[] memory expectedRates) {
        expectedRates = new uint256[](2);
        expectedRates[1] = _buyAmount * 300;
    }

    function getAmountsOut(uint256 _sellAmount, address[] memory) public pure returns (uint[] memory expectedRates) {
        expectedRates = new uint256[](2);
        expectedRates[1] = _sellAmount * 300;
    }

}
