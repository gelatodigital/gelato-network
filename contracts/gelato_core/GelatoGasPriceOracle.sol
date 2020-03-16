pragma solidity ^0.6.4;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/SafeMath.sol";

abstract contract GelatoGasPriceOracle is IGelatoGasPriceOracle {

    using SafeMath for uint256;

    // Oracle
    address public override oracle = 0xe1F076849B781b1395Fd332dC1758Dbc129be6EC;  // luis initially
    uint256 public override oracleFunds;
    uint256 public override oraclePercentageFee = 2;  // 2% per provider/executor top-up
    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    // Regulator
    address public override regulator = 0x8B3765eDA5207fB21690874B722ae276B96260E0;  // hilmar initially
    uint256 public override gelatoGasPriceLimit = 100000000000;  // 100 gwei initial

    // Oracle
    modifier onlyOracle {
        require(msg.sender == oracle, "GelatoGasPriceOracle.onlyOracle");
        _;
    }

    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOracle {
        require(
            _newGasPrice < gelatoGasPriceLimit,
            "GelatoGasPriceOracle.setGelatoGasPrice: exceeds limit"
        );
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    function changeOracle(address _newOracle) external override onlyOracle {
        require(
            _newOracle != address(0),
            "GelatoGasPriceOracle.changeOracle: address 0"
        );
        require(
            oracleFunds == 0,
            "GelatoGasPriceOracle.changeOracle: outstanding oracle funds"
        );
        emit LogChangeOracle(oracle, _newOracle);
        oracle = _newOracle;
    }

    function withdrawOracleFunds(uint256 _amount) external override onlyOracle {
        uint256 currentBalance = oracleFunds;
        uint256 newBalance = currentBalance.sub(
            _amount,
            "GelatoGasPriceOracle.withdrawOracleFunds: underflow"
        );
        oracleFunds = newBalance;
        emit LogWithdrawOracleFunds(currentBalance, newBalance);
    }

    function setOraclePercentageFee(uint256 _newFee) external override onlyOracle {
        emit LogSetOraclePercantageFee(oraclePercentageFee, _newFee);
        oraclePercentageFee = _newFee;
    }

    function calculateOracleFee(uint256 _amount) public view override returns(uint256 fee) {
        fee = SafeMath.div(
            _amount.mul(oraclePercentageFee),
            100,
            "GelatoGasPriceOracle.handleOracleFee: div error"
        );
    }


    // Regulator
    modifier onlyRegulator {
        require(msg.sender == regulator, "GelatoGasPriceOracle.onlyRegulator");
        _;
    }

    function setGelatoGasPriceLimit(uint256 _newLimit) external override onlyRegulator {
        emit LogSetGelatoGasPriceLimit(gelatoGasPriceLimit, _newLimit);
        gelatoGasPriceLimit = _newLimit;
    }

    function changeRegulator(address _newRegulator) external override onlyRegulator {
        require(
            _newRegulator != address(0),
            "GelatoGasPriceOracle.changeRegulator: address 0"
        );
        emit LogChangeRegulator(regulator, _newRegulator);
        regulator = _newRegulator;
    }
}