pragma solidity ^0.6.2;

import "./interfaces/IGelatoGasPriceOracle.sol";

abstract contract GelatoGasPriceOracle is IGelatoGasPriceOracle {

    address public override oracle = 0xe1F076849B781b1395Fd332dC1758Dbc129be6EC;  // luis initially
    address public override regulator = 0x8B3765eDA5207fB21690874B722ae276B96260E0;  // hilmar initially
    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    uint256 public override gelatoGasPriceLimit = 100000000000;  // 100 gwei initial

    modifier onlyOracle {
        require(msg.sender == oracle, "GelatoGasPriceOracle.onlyOracle");
        _;
    }

    modifier onlyRegulator {
        require(msg.sender == regulator, "GelatoGasPriceOracle.onlyRegulator");
        _;
    }

    function changeOracle(address _newOracle) external override onlyOracle {
        require(
            _newOracle != address(0),
            "GelatoGasPriceOracle.changeOracle: address 0"
        );
        emit LogChangeOracle(oracle, _newOracle);
        oracle = _newOracle;
    }

    function changeRegulator(address _newRegulator) external override onlyRegulator {
        require(
            _newRegulator != address(0),
            "GelatoGasPriceOracle.changeRegulator: address 0"
        );
        emit LogChangeRegulator(regulator, _newRegulator);
        regulator = _newRegulator;
    }

    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOracle {
        require(
            _newGasPrice < gelatoGasPriceLimit,
            "GelatoGasPriceOracle.setGelatoGasPrice: exceeds limit"
        );
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    function setGelatoGasPriceLimit(uint256 _newLimit) external override onlyRegulator {
        emit LogSetGelatoGasPriceLimit(gelatoGasPriceLimit, _newLimit);
        gelatoGasPriceLimit = _newLimit;
    }
}