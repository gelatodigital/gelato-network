pragma solidity ^0.6.4;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/Ownable.sol";

contract GelatoGasPriceOracle is IGelatoGasPriceOracle, Ownable {
    // This gasPrice is pulled into GelatoCore.exec() via GelatoSysAdmin.gelatoGasPrice()
    uint256 private gasPrice;

    address public override oracleAdmin;
    address public override gelatoCore;

    constructor(uint256 _gasPrice, address _gelatoCore) public {
        gasPrice = _gasPrice;
        oracleAdmin = msg.sender;
        gelatoCore = _gelatoCore;
    }

    function setGasPrice(uint256 _newGasPrice) external override  {
        require(msg.sender == oracleAdmin, "Only oracleAdmin can set gasPrice");
        require(_newGasPrice != 0, "gasPrice cannot be zero");
        emit LogSetGasPrice(gasPrice, _newGasPrice);
        gasPrice = _newGasPrice;
    }

    function getGasPrice() view external override returns(uint256) {
        require(msg.sender == gelatoCore, "Only gelatoCore can read oracle");
        return gasPrice;
    }

    function setOracleAdmin(address _newOracleAdmin) external onlyOwner override  {
        emit LogSetOracleAdmin(oracleAdmin, _newOracleAdmin);
        if (_newOracleAdmin == address(0)) delete oracleAdmin;
        else oracleAdmin = _newOracleAdmin;
    }

    function setGelatoCore(address _newGelatoCore) external onlyOwner override  {
        emit LogSetGelatoCore(gelatoCore, _newGelatoCore);
        if (_newGelatoCore == address(0)) delete gelatoCore;
        else gelatoCore = _newGelatoCore;
    }
}