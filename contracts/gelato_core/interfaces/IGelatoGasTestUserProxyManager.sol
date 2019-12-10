pragma solidity ^0.5.11;


interface IGelatoGasTestUserProxyManager {

    function createGasTestUserProxy() external returns(address gasTestUserProxy);

    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        returns(address);

    function getGasTestProxyOfUser(address _user)
        external
        view
        returns(address);
}