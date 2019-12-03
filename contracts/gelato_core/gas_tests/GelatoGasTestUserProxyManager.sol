pragma solidity ^0.5.13;

import "../interfaces/IGelatoGasTestUserProxyManager.sol";
import "./GelatoGasTestUserProxy.sol";

contract GelatoGasTestUserProxyManager is IGelatoGasTestUserProxyManager {
    // non-deploy base contract
    constructor() internal {}

    mapping(address => address) internal userToGasTestProxy;
    mapping(address => address) internal gasTestProxyToUser;

    modifier gasTestProxyCheck(address _) {
        require(_isGasTestProxy(_), "GelatoGasTestUserProxyManager.isGasTestProxy");
        _;
    }

    function createGasTestUserProxy()
        external
        returns(address gasTestUserProxy)
    {
        gasTestUserProxy = address(new GelatoGasTestUserProxy(msg.sender));
        userToGasTestProxy[msg.sender] = gasTestUserProxy;
        gasTestProxyToUser[gasTestUserProxy] = msg.sender;
    }

    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        returns(address)
    {
        return gasTestProxyToUser[_gasTestProxy];
    }

    function getGasTestProxyOfUser(address _user)
        external
        view
        returns(address)
    {
        return userToGasTestProxy[_user];
    }

    function _isGasTestProxy(address _) private view returns(bool) {
        return gasTestProxyToUser[_] != address(0);
    }
}