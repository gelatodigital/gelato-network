pragma solidity ^0.6.2;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/Ownable.sol";

abstract contract GelatoGasPriceOracle is IGelatoGasPriceOracle, Ownable {

    event LogSetGelatoGasPrice(uint256 oldGasPrice, uint256 newGasPrice, address oracle);

    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial

    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice, msg.sender);
        gelatoGasPrice = _newGasPrice;
    }
}