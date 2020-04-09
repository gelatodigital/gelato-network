pragma solidity ^0.6.6;

interface IGelatoGasPriceOracle {
    // Owner
    event LogSetOracleAdmin(address indexed oldOracleAdmin, address indexed newOracleAdmin);
    event LogSetGelatoCore(address indexed oldGelatoCore, address indexed newGelatoCore);

    // OracleAdmin
    event LogSetGasPrice(uint256 indexed oldGasPrice, uint256 indexed newGasPrice);

    // Owner
    function setOracleAdmin(address _newOracleAdmin) external;
    function setGelatoCore(address _newGelatoCore) external;

    // OracleAdmin
    function setGasPrice(uint256 _newGasPrice) external;

    function oracleAdmin() external view returns(address);
    function gelatoCore() external view returns(address);

    function getGasPrice() external view returns(uint256);
}
