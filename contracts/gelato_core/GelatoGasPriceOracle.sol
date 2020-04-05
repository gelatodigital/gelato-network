pragma solidity ^0.6.4;

import "./interfaces/IGelatoGasPriceOracle.sol";
import "../external/Ownable.sol";

contract GelatoGasPriceOracle is IGelatoGasPriceOracle, Ownable {

    address public override oracleAdmin;
    address public override gelatoCore;

    // This gasPrice is pulled into GelatoCore.exec() via GelatoSysAdmin.gelatoGasPrice()
    uint256 private gasPrice;

    constructor(address _gelatoCore, uint256 _gasPrice) public {
        setOracleAdmin(msg.sender);
        setGelatoCore(_gelatoCore);
        setGasPrice(_gasPrice);
    }

    modifier onlyOracleAdmin {
        require(msg.sender == oracleAdmin, "GelatoGasPriceOracle.onlyOracleAdmin");
        _;
    }

    function setOracleAdmin(address _newOracleAdmin) public onlyOwner override  {
        emit LogSetOracleAdmin(oracleAdmin, _newOracleAdmin);
        oracleAdmin = _newOracleAdmin;
    }

    function setGelatoCore(address _newGelatoCore) public onlyOwner override  {
        emit LogSetGelatoCore(gelatoCore, _newGelatoCore);
        gelatoCore = _newGelatoCore;
    }

    function setGasPrice(uint256 _newGasPrice) public override onlyOracleAdmin {
        require(_newGasPrice != 0, "gasPrice cannot be zero");
        emit LogSetGasPrice(gasPrice, _newGasPrice);
        gasPrice = _newGasPrice;
    }

    function getGasPrice() view external override returns(uint256) {
        require(msg.sender == gelatoCore, "Only gelatoCore can read oracle");
        return gasPrice;
    }
}
