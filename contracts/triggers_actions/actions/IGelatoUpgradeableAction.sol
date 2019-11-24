pragma solidity ^0.5.10;

interface IGelatoUpgradeableAction {
    function getMyProxyAdmin() external view returns(address);
    function getMyImplementation() external view returns(address);
}