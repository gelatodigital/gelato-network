pragma solidity ^0.6.6;

interface IGelatoGasPriceOracle {
    // Owner
    event LogSetOracle(address indexed oldOracle, address indexed newOracle);
    event LogSetGelatoCore(address indexed oldGelatoCore, address indexed newGelatoCore);

    // Oracle
    event LogSetGasPrice(uint256 indexed oldGasPrice, uint256 indexed newGasPrice);

    // Owner

    /// @notice Set new address that can set the gas price
    /// @dev Only callable by owner
    /// @param _newOracle Address of new oracle admin
    function setOracle(address _newOracle) external;

    /// @notice Set new address of gelato core
    /// @dev Only callable by owner
    /// @param _newGelatoCore Address of new gelato core
    function setGelatoCore(address _newGelatoCore) external;

    // Oracle

    /// @notice Set new gelato gas price
    /// @dev Only callable by oracle admin
    /// @param _newGasPrice New gas price in wei
    function setGasPrice(uint256 _newGasPrice) external;

    /// @notice Get address of oracle admin that can set gas prices
    /// @return Oracle Admin address
    function oracle() external view returns(address);

    /// @notice Get address of gelato core
    /// @return Gelato Core address
    function gelatoCore() external view returns(address);

    /// @notice Get current gas price
    /// @return Gas price in wei
    function getGasPrice() external view returns(uint256);
}
