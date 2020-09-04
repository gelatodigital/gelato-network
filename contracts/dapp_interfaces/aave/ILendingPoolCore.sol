// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface ILendingPoolCore {
	function getReserveATokenAddress(address _reserve) external view returns (address);
	function getReserveCurrentLiquidityRate(address _reserve) external view returns (uint256);
}
