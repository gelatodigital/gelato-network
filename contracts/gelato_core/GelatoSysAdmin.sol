pragma solidity ^0.6.4;

import "./interfaces/IGelatoSysAdmin.sol";
import "../external/Ownable.sol";
import "../external/Address.sol";
import "../external/SafeMath.sol";
import "../external/Math.sol";

abstract contract GelatoSysAdmin is IGelatoSysAdmin, Ownable {

    using Address for address payable;
    using SafeMath for uint256;

    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    uint256 public override gelatoMaxGas = 7000000;  // 7 mio initial
    uint256 public override minProviderStake = 0.1 ether;  // production: 1 ETH
    uint256 public override minExecutorStake = 0.02 ether;  // production: 1 ETH
    uint256 public override execClaimTenancy = 30 days;
    uint256 public override execClaimRent = 1 finney;
    uint256 public override executorSuccessShare = 50;  // 50% of successful execution cost
    uint256 public override sysAdminSuccessShare = 20;  // 20% of successful execution cost
    uint256 public override sysAdminFunds;

    // Exec Gas Values
    uint256 public internalGasRequirement = 500000;

    // == The main functions of the Sys Admin (DAO) ==
    // exec-tx gasprice
    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        require(_newGasPrice != 0, "Cannot be zero");
        gelatoGasPrice = _newGasPrice;
    }

    // exec-tx gas
    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyOwner {
        emit LogSetGelatoMaxGas(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }

    // Minimum Executor Stake Per Provider
    function setMinExecutorStake(uint256 _newMin) external override onlyOwner {
        emit LogSetMinExecutorStake(minExecutorStake, _newMin);
        if (_newMin == 0) delete minExecutorStake;
        else minExecutorStake = _newMin;
    }

    // Minimum Executor Stake Per Provider
    function setMinProviderStake(uint256 _newMin) external override onlyOwner {
        emit LogSetMinProviderStake(minProviderStake, _newMin);
        if (_newMin == 0) delete minProviderStake;
        else minProviderStake = _newMin;
    }

    // execClaim lifespan
    function setExecClaimTenancy(uint256 _lifespan) external override onlyOwner {
        emit LogSetExecClaimTenancy(execClaimTenancy, _lifespan);
        if (_lifespan == 0) delete execClaimTenancy;
        else execClaimTenancy = _lifespan;
    }

    // execClaim rent per lifespan
    function setExecClaimRent(uint256 _rent) external override onlyOwner {
        emit LogSetExecClaimRent(execClaimRent, _rent);
        if (_rent == 0) delete execClaimRent;
        else execClaimRent = _rent;
    }

    // Executors' profit share on exec costs
    function setExecutorSuccessShare(uint256 _percentage) external override onlyOwner {
        emit LogSetExecutorSuccessShare(executorSuccessShare, _percentage);
        if (_percentage == 0) delete executorSuccessShare;
        else executorSuccessShare = _percentage;
    }

    // Sys Admin (DAO) Business Model
    function setSysAdminSuccessShare(uint256 _percentage) external override onlyOwner {
        emit LogSetSysAdminSuccessShare(sysAdminSuccessShare, _percentage);
        if (_percentage == 0) delete sysAdminSuccessShare;
        else sysAdminSuccessShare = _percentage;
    }

    function withdrawSysAdminFunds(uint256 _amount)
        external
        override
        onlyOwner
        returns(uint256 realWithdrawAmount)
    {
        uint256 currentBalance = sysAdminFunds;

        realWithdrawAmount = Math.min(_amount, currentBalance);

        uint256 newSysAdminFunds = currentBalance - realWithdrawAmount;

        // Effects
        sysAdminFunds = newSysAdminFunds;

        msg.sender.sendValue(realWithdrawAmount);
        emit LogWithdrawOracleFunds(currentBalance, newSysAdminFunds);
    }

    // Executors' total fee for a successful exec
    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(executorSuccessShare),
            100,
            "GelatoExecutors.executorSuccessFee: div error"
        );
    }

    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(sysAdminSuccessShare),
            100,
            "GelatoSysAdmin.sysAdminSuccessShare: div error"
        );
    }
}