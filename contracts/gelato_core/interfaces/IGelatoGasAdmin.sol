pragma solidity ^0.6.4;

interface IGelatoGasAdmin {
    // Oracle
    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogChangeOracle(address oldOracle, address newOracle);
    event LogSetOracleFeeFactor(uint256 oldFeeFactor, uint256 newFeeFactor);
    event LogWithdrawOracleFunds(uint256 oldBalance, uint256 newBalance);

    // Regulator
    event LogSetGelatoGasPriceLimit(uint256 oldLimit, uint256 newLimit);
    event LogSetGelatoMaxGas(uint256 oldMaxGas, uint256 newMaxGas);
    event LogChangeRegulator(address oldRegulator, address newRegulator);

    // Oracle (only Oracle can change state)
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function changeOracle(address _newOracle) external;
    function setOracleFeeFactor(uint256 _newFeeFactor) external;
    function withdrawOracleFunds(uint256 _amount) external;

    // Regulator (only Regulator can change state)
    function setGelatoGasPriceLimit(uint256 _newLimit) external;
    function setGelatoMaxGas(uint256 _newMaxGas) external;
    function changeRegulator(address _newRegulator) external;

    // Oracle
    function gelatoGasPrice() external view returns (uint256);
    function oracle() external view returns (address);
    function oracleFunds() external view returns (uint256);
    function oracleSuccessFeeFactor() external view returns (uint256);
    function oracleSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);

    // Regulator
    function gelatoGasPriceLimit() external view returns (uint256);
    function gelatoMaxGas() external view returns (uint256);
    function regulator() external view returns (address);
}
