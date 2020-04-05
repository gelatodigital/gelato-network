pragma solidity ^0.6.4;

interface IGelatoGasPriceOracle {
    event LogSetGasPrice(uint256 indexed oldGasPrice, uint256 indexed newGasPrice);
    event LogSetOracleAdmin(address indexed oldOracleAdmin, address indexed newOracleAdmin);
    event LogSetGelatoCore(address indexed oldGelatoCore, address indexed newGelatoCore);

    function setGasPrice(uint256 _newGasPrice) external;
    function setOracleAdmin(address _newOracleAdmin) external;
    function setGelatoCore(address _newGelatoCore) external;

    function getGasPrice() external view returns(uint256);
    function oracleAdmin() external view returns(address);
    function gelatoCore() external view returns(address);
}
