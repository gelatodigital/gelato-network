// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import "./IUniswapExchange.sol";

interface IUniswapFactory {
    function getExchange(IERC20 token)
        external
        view
        returns (IUniswapExchange exchange);
}
