pragma solidity ^0.6.4;

import "./interfaces/IGelatoSysAdmin.sol";
import "../external/Ownable.sol";
import "../external/SafeMath.sol";

abstract contract GelatoSysAdmin is IGelatoSysAdmin, Ownable {

    using SafeMath for uint256;

    uint256 public override execClaimLifespan = 90 days;
    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    uint256 public override gelatoMaxGas = 7000000;  // 7 mio initial
    uint256 public override sysAdminSuccessShare = 2;  // 2% on successful execution cost
    uint256 public override gasAdminFunds;

    // == The main functions of the Sys Admin (DAO) ==
    //

    // exec-tx gasprice
    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    // exec-tx gas
    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyOwner {
        emit LogSetGelatoMaxGas(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }


    // Sys Admin (DAO) Business Model
    function setSysAdminSuccessShare(uint256 _percentage) external override onlyOwner {
        require(_percentage < 100, "GelatoSysAdmin.setSysAdminSuccessShare: over 100");
        emit LogSetSysAdminSuccessShare(sysAdminSuccessShare, _percentage);
        sysAdminSuccessShare = _percentage;
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

    function withdrawSysAdminFunds(uint256 _amount) external override onlyOwner {
        uint256 currentBalance = gasAdminFunds;
        uint256 newBalance = currentBalance.sub(
            _amount,
            "GelatoSysAdmin.withdrawSysAdminFunds: underflow"
        );
        gasAdminFunds = newBalance;
        emit LogWithdrawOracleFunds(currentBalance, newBalance);
    }

}