pragma solidity ^0.6.6;

import { IGelatoGasPriceOracle } from "./IGelatoGasPriceOracle.sol";

interface IGelatoSysAdmin {
    // Events
    event LogSetGelatoGasPriceOracle(address indexed oldOracle, address indexed newOracle);

    event LogSetGelatoMaxGas(uint256 oldMaxGas, uint256 newMaxGas);
    event LogSetInternalGasRequirement(uint256 oldRequirment, uint256 newRequirment);

    event LogSetMinExecutorStake(uint256 oldMin, uint256 newMin);
    event LogSetMinProviderStake(uint256 oldMin, uint256 newMin);

    event LogSetExecClaimRent(uint256 oldRent, uint256 newRent);
    event LogSetExecClaimTenancy(uint256 oldLifespan, uint256 newLifespan);

    event LogSetExecutorSuccessShare(uint256 oldShare, uint256 newShare, uint256 total);
    event LogSetSysAdminSuccessShare(uint256 oldShare, uint256 newShare, uint256 total);

    event LogWithdrawSysAdminFunds(uint256 oldBalance, uint256 newBalance);

    // State Writing
    function setGelatoGasPriceOracle(address _newOracle) external;

    function setGelatoMaxGas(uint256 _newMaxGas) external;
    function setInternalGasRequirement(uint256 _newRequirement) external;

    function setMinExecutorStake(uint256 _newMin) external;
    function setMinProviderStake(uint256 _newMin) external;

    function setExecClaimRent(uint256 _rent) external;
    function setExecClaimTenancy(uint256 _lifespan) external;

    function setExecutorSuccessShare(uint256 _percentage) external;
    function setSysAdminSuccessShare(uint256 _percentage) external;

    function withdrawSysAdminFunds(uint256 _amount) external returns(uint256);

    // State Reading
    function EXEC_TX_OVERHEAD() external pure returns(uint256);

    function gelatoGasPriceOracle() external view returns(IGelatoGasPriceOracle);

    function gelatoMaxGas() external view returns(uint256);
    function internalGasRequirement() external view returns(uint256);

    function minExecutorStake() external view returns(uint256);
    function minProviderStake() external view returns(uint256);

    function execClaimRent() external view returns(uint256);
    function execClaimTenancy() external view returns(uint256);

    function executorSuccessShare() external view returns(uint256);
    function totalSuccessShare() external view returns(uint256);

    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(uint256);

    function sysAdminSuccessShare() external view returns(uint256);
    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(uint256);

    function sysAdminFunds() external view returns(uint256);
}
