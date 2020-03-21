pragma solidity ^0.6.4;

import "./interfaces/IGelatoGasAdmin.sol";
import "../external/SafeMath.sol";

abstract contract GelatoGasAdmin is IGelatoGasAdmin {

    using SafeMath for uint256;

    // Oracle
    address public override oracle = 0xe1F076849B781b1395Fd332dC1758Dbc129be6EC;  // luis initially
    uint256 public override oracleFunds;
    uint256 public override oracleSuccessFeeFactor = 2;  // 2% per provider/executor top-up
    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    // Regulator
    address public override regulator = 0x8B3765eDA5207fB21690874B722ae276B96260E0;  // hilmar initially
    uint256 public override gelatoGasPriceLimit = 100000000000;  // 100 gwei initial
    // The maximum gas an executor can consume on behalf of a provider
    uint256 public override gelatoMaxGas = 6000000;  // 6 mio initial

    // Oracle
    modifier onlyOracle {
        require(msg.sender == oracle, "GelatoGasAdmin.onlyOracle");
        _;
    }

    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOracle {
        require(
            _newGasPrice < gelatoGasPriceLimit,
            "GelatoGasAdmin.setGelatoGasPrice: exceeds limit"
        );
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    function changeOracle(address _newOracle) external override onlyOracle {
        require(
            _newOracle != address(0),
            "GelatoGasAdmin.changeOracle: address 0"
        );
        require(
            oracleFunds == 0,
            "GelatoGasAdmin.changeOracle: outstanding oracle funds"
        );
        emit LogChangeOracle(oracle, _newOracle);
        oracle = _newOracle;
    }

    function withdrawOracleFunds(uint256 _amount) external override onlyOracle {
        uint256 currentBalance = oracleFunds;
        uint256 newBalance = currentBalance.sub(
            _amount,
            "GelatoGasAdmin.withdrawOracleFunds: underflow"
        );
        oracleFunds = newBalance;
        emit LogWithdrawOracleFunds(currentBalance, newBalance);
    }

    function setOracleFeeFactor(uint256 _feeFactor) external override onlyOracle {
        require(_feeFactor < 100, "GelatoGasAdmin.setOracleFeeFactor: over 100");
        emit LogSetOracleFeeFactor(oracleSuccessFeeFactor, _feeFactor);
        oracleSuccessFeeFactor = _feeFactor;
    }

    function oracleSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(oracleSuccessFeeFactor),
            100,
            "GelatoGasAdmin.oracleSuccessFee: div error"
        );
    }

    // Regulator
    modifier onlyRegulator {
        require(msg.sender == regulator, "GelatoGasAdmin.onlyRegulator");
        _;
    }

    function setGelatoGasPriceLimit(uint256 _newLimit) external override onlyRegulator {
        emit LogSetGelatoGasPriceLimit(gelatoGasPriceLimit, _newLimit);
        gelatoGasPriceLimit = _newLimit;
    }

    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyRegulator {
        emit LogSetGelatoMaxGas(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }

    function changeRegulator(address _newRegulator) external override onlyRegulator {
        require(
            _newRegulator != address(0),
            "GelatoGasAdmin.changeRegulator: address 0"
        );
        emit LogChangeRegulator(regulator, _newRegulator);
        regulator = _newRegulator;
    }
}