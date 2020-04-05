pragma solidity ^0.6.4;

import "../external/Ownable.sol";
import "./interfaces/IGelatoOracle.sol";

contract GelatoOracle is IGelatoOracle, Ownable {

    address public override oracleAdmin;
    address public override gelatoCore;
    uint256 private gelatoGasPrice;

    event LogSetGelatoGasPrice(uint256 indexed gelatoGasPrice, uint256 indexed _newGasPrice);
    event LogSetNewOracleAdmin(address indexed newOracleAdmin);

    constructor(uint256 _gelatoGasPrice, address _gelatoCore) public {
        oracleAdmin = msg.sender;
        gelatoGasPrice = _gelatoGasPrice;
        gelatoCore = _gelatoCore;
    }

    function setGelatoGasPrice(uint256 _newGasPrice) external override  {
        require(msg.sender == oracleAdmin, "Only oracleAdmin can set gelatoGasPrice");
        require(_newGasPrice != 0, "gelatoGasPrice cannot be zero");
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    function getGasPrice() view external override returns(uint256) {
        // emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        require(msg.sender == gelatoCore, "Only gelatoCore can read oracle");
        return gelatoGasPrice;
    }

    function setOracleAdmin(address _newOracleAdmin) external onlyOwner override  {
        require(_newOracleAdmin != address(0), "New Oracle admin cannot be address(0)");
        emit LogSetNewOracleAdmin(_newOracleAdmin);
        oracleAdmin = _newOracleAdmin;
    }

}