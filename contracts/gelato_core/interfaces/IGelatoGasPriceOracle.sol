// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IGelatoGasPriceOracle {
    // Owner
    event LogOracleSet(address indexed oldOracle, address indexed newOracle);

    // Oracle
    event LogGasPriceSet(uint256 indexed oldGasPrice, uint256 indexed newGasPrice);

    // Owner

    /// @notice Set new address that can set the gas price
    /// @dev Only callable by owner
    /// @param _newOracle Address of new oracle admin
    function setOracle(address _newOracle) external;

    // Oracle

    /// @notice Set new gelato gas price
    /// @dev Only callable by oracle admin
    /// @param _newGasPrice New gas price in wei
    function setGasPrice(uint256 _newGasPrice) external;

    /// @notice Get address of oracle admin that can set gas prices
    /// @return Oracle Admin address
    function oracle() external view returns(address);

    /// @notice Get current gas price
    /// @return Gas price in wei
    function latestAnswer() external view returns(int256);
}
