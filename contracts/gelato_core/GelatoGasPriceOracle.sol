pragma solidity ^0.6.8;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/Ownable.sol";

contract GelatoGasPriceOracle is IGelatoGasPriceOracle, Ownable {

    address public override oracle;

    // This gasPrice is pulled into GelatoCore.exec() via GelatoSysAdmin._getGelatoGasPrice()
    uint256 private gasPrice;

    constructor(uint256 _gasPrice) public {
        setOracle(msg.sender);
        setGasPrice(_gasPrice);
    }

    modifier onlyOracle {
        require(msg.sender == oracle, "GelatoGasPriceOracle.onlyOracle");
        _;
    }

    function setOracle(address _newOracle) public override onlyOwner {
        emit LogOracleSet(oracle, _newOracle);
        oracle = _newOracle;
    }

    function setGasPrice(uint256 _newGasPrice) public override onlyOracle {
        require(_newGasPrice != 0, "gasPrice cannot be zero");
        emit LogGasPriceSet(gasPrice, _newGasPrice);
        gasPrice = _newGasPrice;
    }

    function latestAnswer() view external override returns(int256) {
        return int256(gasPrice);
    }
}
