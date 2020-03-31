pragma solidity ^0.6.4;

interface IGelatoSysAdmin {

    event LogSetExecClaimLifespan(uint256 oldLifespan, uint256 newLifespan);

    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice);
    event LogSetGelatoMaxGas(uint256 oldMaxGas, uint256 newMaxGas);

    event LogSetSysAdminSuccessShare(uint256 oldFeeFactor, uint256 newFeeFactor);
    event LogWithdrawOracleFunds(uint256 oldBalance, uint256 newBalance);


    function setExecClaimLifespan(uint256 _lifespan) external;

    function setGelatoGasPrice(uint256 _newGasPrice) external;
    function setGelatoMaxGas(uint256 _newMaxGas) external;

    function setSysAdminSuccessShare(uint256 _percentage) external;

    function withdrawSysAdminFunds(uint256 _amount) external;


    function execClaimLifespan() external view returns(uint256);

    function gelatoGasPrice() external view returns (uint256);
    function gelatoMaxGas() external view returns (uint256);

    function sysAdminSuccessShare() external view returns (uint256);
    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);

    function gasAdminFunds() external view returns (uint256);
}
