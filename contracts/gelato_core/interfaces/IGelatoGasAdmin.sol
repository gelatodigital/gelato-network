pragma solidity ^0.6.4;

interface IGelatoGasAdmin {
    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogSetGelatoMaxGas(uint256 oldMaxGas, uint256 newMaxGas);
    event LogSetGasAdminSuccessShare(uint256 oldFeeFactor, uint256 newFeeFactor);
    event LogWithdrawOracleFunds(uint256 oldBalance, uint256 newBalance);

    // Gas
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function setGelatoMaxGas(uint256 _newMaxGas) external;
    // Charge
    function setGasAdminSuccessShare(uint256 _percentage) external;
    // Funds
    function withdrawGasAdminFunds(uint256 _amount) external;

    // Gas
    function gelatoGasPrice() external view returns (uint256);
    function gelatoMaxGas() external view returns (uint256);
    // Charge
    function gasAdminSuccessShare() external view returns (uint256);
    function gasAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);
    // Funds
    function gasAdminFunds() external view returns (uint256);

}
