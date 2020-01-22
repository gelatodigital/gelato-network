pragma solidity ^0.6.0;


interface IGelatoGasTestUserProxyManager {
    function createGasTestUserProxy() external returns(address gasTestUserProxy);
    function userByGasTestProxy(address _user) external view returns(address);
    function gasTestProxyByUser(address _gasTestProxy) external view returns(address);
}