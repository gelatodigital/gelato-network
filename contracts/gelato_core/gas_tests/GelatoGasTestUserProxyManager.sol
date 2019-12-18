pragma solidity ^0.6.0;

import "../interfaces/IGelatoGasTestUserProxyManager.sol";
import "./GelatoGasTestUserProxy.sol";

abstract contract GelatoGasTestUserProxyManager is IGelatoGasTestUserProxyManager {

    mapping(address => address) internal userToGasTestProxy;
    mapping(address => address) internal gasTestProxyToUser;

    modifier gasTestProxyCheck(address _) {
        require(_isGasTestProxy(_), "GelatoGasTestUserProxyManager.isGasTestProxy");
        _;
    }

    function createGasTestUserProxy()
        external
        override
        returns(address gasTestUserProxy)
    {
        gasTestUserProxy = address(new GelatoGasTestUserProxy(msg.sender));
        userToGasTestProxy[msg.sender] = gasTestUserProxy;
        gasTestProxyToUser[gasTestUserProxy] = msg.sender;
    }

    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        override
        returns(address)
    {
        return gasTestProxyToUser[_gasTestProxy];
    }

    function getGasTestProxyOfUser(address _user)
        external
        view
        override
        returns(address)
    {
        return userToGasTestProxy[_user];
    }

    function _isGasTestProxy(address _) private view returns(bool) {
        return gasTestProxyToUser[_] != address(0);
    }
}