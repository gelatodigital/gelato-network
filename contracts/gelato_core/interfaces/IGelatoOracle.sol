pragma solidity ^0.6.4;

interface IGelatoOracle {

    event LogSetGelatoGasPrice(uint256 indexed gelatoGasPrice, uint256 indexed _newGasPrice);
    event LogSetNewOracleAdmin(address indexed newOracleAdmin);

    function oracleAdmin() external returns(address);

    function gelatoCore() external returns(address);

    function setGelatoGasPrice(uint256 _newGasPrice) external;

    function getGasPrice() external view returns(uint256);

    function setOracleAdmin(address _newOracleAdmin) external;
}
