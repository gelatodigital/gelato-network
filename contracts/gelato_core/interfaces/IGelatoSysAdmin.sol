pragma solidity ^0.6.4;

interface IGelatoSysAdmin {
    // Events
    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogSetGelatoMaxGas(uint256 oldMaxGas, uint256 newMaxGas);

    event LogSetMinExecutorStake(uint256 oldMin, uint256 newMin);

    event LogSetExecClaimRentPerLifespan(uint256 oldRent, uint256 newRent);
    event LogSetExecClaimLifespan(uint256 oldLifespan, uint256 newLifespan);

    event LogSetExecutorSuccessShare(uint256 oldShare, uint256 newShare);
    event LogSetSysAdminSuccessShare(uint256 oldFeeFactor, uint256 newFeeFactor);

    event LogWithdrawOracleFunds(uint256 oldBalance, uint256 newBalance);

    // State Writing
    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function setGelatoMaxGas(uint256 _newMaxGas) external;

    function setMinExecutorStake(uint256 _newMin) external;

    function setExecClaimRentPerLifespan(uint256 _rent) external;
    function setExecClaimLifespan(uint256 _lifespan) external;

    function setExecutorSuccessShare(uint256 _percentage) external;
    function setSysAdminSuccessShare(uint256 _percentage) external;

    function withdrawSysAdminFunds(uint256 _amount) external;

    // State Reading
    function gelatoGasPrice() external view returns (uint256);
    function gelatoMaxGas() external view returns (uint256);

    function minExecutorStake() external view returns(uint256);

    function execClaimRentPerLifespan() external view returns(uint256);
    function execClaimLifespan() external view returns(uint256);

    function executorSuccessShare() external view returns (uint256);
    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);
    function sysAdminSuccessShare() external view returns (uint256);
    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);

    function sysAdminFunds() external view returns (uint256);
}
