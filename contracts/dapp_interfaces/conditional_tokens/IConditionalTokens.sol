// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import "../../external/IERC20.sol";

interface IConditionalTokens {

    function mergePositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint256 indexSet) external view returns (bytes32);

    function getPositionId(IERC20 collateralToken, bytes32 collectionId) external pure returns (uint256);

}

interface IERC1155 {
    function balanceOf(address owner, uint256 id) external view returns (uint256);
    function balanceOfBatch(
        address[] calldata owners,
        uint256[] calldata ids
    )
        external
        view
        returns (uint256[] calldata);
}

interface IFixedProductMarketMaker {
    function removeFunding(uint256 sharesToBurn) external;
}