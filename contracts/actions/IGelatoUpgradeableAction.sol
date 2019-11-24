pragma solidity ^0.5.10;

interface IGelatoUpgradeableAction {
    function getMyProxyAdminAddress() external view returns(address);
    function getMyImplementationAddress() external view returns(address);
}