pragma solidity ^0.6.6;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/Ownable.sol";

contract GelatoGasPriceOracle is IGelatoGasPriceOracle, Ownable {

    address public override oracle;
    address public override gelatoCore;

    // This gasPrice is pulled into GelatoCore.exec() via GelatoSysAdmin._getGelatoGasPrice()
    uint256 private gasPrice;

    constructor(address _gelatoCore, uint256 _gasPrice) public {
        setOracle(msg.sender);
        setGelatoCore(_gelatoCore);
        setGasPrice(_gasPrice);
    }

    modifier onlyOracle {
        require(msg.sender == oracle, "GelatoGasPriceOracle.onlyOracle");
        _;
    }

    modifier onlyGelatoCore {
        require(msg.sender == gelatoCore, "GelatoGasPriceOracle.onlyGelatoCore");
        _;
    }

    function setOracle(address _newOracle) public override onlyOwner {
        emit LogSetOracle(oracle, _newOracle);
        oracle = _newOracle;
    }

    function setGelatoCore(address _newGelatoCore) public override onlyOwner  {
        emit LogSetGelatoCore(gelatoCore, _newGelatoCore);
        gelatoCore = _newGelatoCore;
    }

    function setGasPrice(uint256 _newGasPrice) public override onlyOracle {
        require(_newGasPrice != 0, "gasPrice cannot be zero");
        emit LogSetGasPrice(gasPrice, _newGasPrice);
        gasPrice = _newGasPrice;
    }

    function getGasPrice() view external override onlyGelatoCore returns(uint256) {
        return gasPrice;
    }
}
