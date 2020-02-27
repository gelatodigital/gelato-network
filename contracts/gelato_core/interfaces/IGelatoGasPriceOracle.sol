pragma solidity ^0.6.2;

interface IGelatoGasPriceOracle {
    event LogChangeOracle(address oldOracle, address newOracle);
    event LogChangeRegulator(address oldRegulator, address newRegulator);
    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogSetGelatoGasPriceLimit(uint256 oldLimit, uint256 newLimit);
    /// @dev only GelatoGasPriceOracle Owner can set this
    function changeOracle(address _newOracle) external;
    function changeRegulator(address _newRegulator) external;
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function setGelatoGasPriceLimit(uint256 _newLimit) external;
    function oracle() external view returns(address);
    function regulator() external view returns(address);
    function gelatoGasPrice() external view returns(uint256);
    function gelatoGasPriceLimit() external view returns(uint256);
}