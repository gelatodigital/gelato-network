pragma solidity ^0.5.11;

interface IGelatoUpgradeableAction {
    function askProxyForProxyAdminAddress() external view returns(address);
    function askImplementationIfInit() external view returns(bool);
    function askProxyIfImplementationInit() external view returns(bool);
    function askProxyForImplementationAddress() external view returns(address);
}