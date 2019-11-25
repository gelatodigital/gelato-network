pragma solidity ^0.5.10;

interface IGelatoUpgradeableAction {
    function askProxyForProxyAdminAddress() external view returns(address);
    function askImplementationIfInit() external view returns(bool);
    function getMyImplementationAddress() external view returns(address);
    function askProxyIfImplementationInit() external view returns(bool);
    function askProxyForImplementationAddress() external view returns(address);
}