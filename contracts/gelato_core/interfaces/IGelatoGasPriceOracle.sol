pragma solidity ^0.6.4;

interface IGelatoGasPriceOracle {
    // Oracle
    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogChangeOracle(address oldOracle, address newOracle);
    event LogSetOraclePercantageFee(uint256 oldFee, uint256 newFee);
    event LogWithdrawOracleFunds(uint256 oldBalance, uint256 newBalance);

    // Regulator
    event LogSetGelatoGasPriceLimit(uint256 oldLimit, uint256 newLimit);
    event LogChangeRegulator(address oldRegulator, address newRegulator);

    // Oracle (only Oracle can change state)
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function changeOracle(address _newOracle) external;
    function setOraclePercentageFee(uint256 _newFee) external;
    function withdrawOracleFunds(uint256 _amount) external;

    // Regulator (only Regulator can change state)
    function setGelatoGasPriceLimit(uint256 _newLimit) external;
    function changeRegulator(address _newRegulator) external;

    // Oracle
    function gelatoGasPrice() external view returns(uint256);
    function oracle() external view returns(address);
    function oracleFunds() external view returns(uint256);
    function oraclePercentageFee() external view returns(uint256);
    function calculateOracleFee(uint256 _amount) external view returns(uint256 fee);

    // Regulator
    function gelatoGasPriceLimit() external view returns(uint256);
    function regulator() external view returns(address);
}