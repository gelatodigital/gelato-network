pragma solidity ^0.6.2;

interface IGelatoGasPriceOracle {
    /// @dev only GelatoGasPriceOracle Owner can set this
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function gelatoGasPrice() external view returns(uint256);
}