// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import "../../external/IERC20.sol";

interface IUniswapExchange {
    function getEthToTokenInputPrice(uint256 ethSold)
        external
        view
        returns (uint256 tokensBought);

    function getTokenToEthOutputPrice(uint256 ethbought)
        external
        view
        returns (uint256 tokensToBeSold);

    function getTokenToEthInputPrice(uint256 tokensSold)
        external
        view
        returns (uint256 ethBought);

    function ethToTokenSwapInput(uint256 MintTokens, uint256 deadline)
        external
        payable
        returns (uint256 tokensBought);

    function ethToTokenSwapOutput(uint256 tokens_bought, uint256 deadline)
        external
        payable
        returns (uint256 tokensSold);

    function ethToTokenTransferInput(
        uint256 MintTokens,
        uint256 deadline,
        address recipient
    ) external payable returns (uint256 tokensBought);

    function tokenToEthSwapInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline
    ) external returns (uint256);

    function tokenToEthSwapOutput(
        uint256 eth_bought,
        uint256 max_tokens,
        uint256 deadline
    ) external returns (uint256);

    function tokenToTokenSwapInput(
        uint256 tokensSold,
        uint256 MintTokensBought,
        uint256 minEthBought,
        uint256 deadline,
        address tokenAddr
    ) external returns (uint256 tokensBought);

    function tokenToEthTransferInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline,
        address recipient
    ) external returns (uint256);

    function tokenToTokenTransferInput(
        uint256 tokens_sold,
        uint256 min_tokens_bought,
        uint256 min_eth_bought,
        uint256 deadline,
        address recipient,
        address token_addr
    ) external returns (uint256);

}
