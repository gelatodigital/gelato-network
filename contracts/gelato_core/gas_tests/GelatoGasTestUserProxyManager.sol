pragma solidity ^0.6.0;

import "../interfaces/IGelatoGasTestUserProxyManager.sol";
import "./GelatoGasTestUserProxy.sol";

abstract contract GelatoGasTestUserProxyManager is IGelatoGasTestUserProxyManager {

    mapping(address => address) public override userByGasTestProxy;
    mapping(address => address) public override gasTestProxyByUser;

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
        userByGasTestProxy[msg.sender] = gasTestUserProxy;
        gasTestProxyByUser[gasTestUserProxy] = msg.sender;
    }

    function _isGasTestProxy(address _) private view returns(bool) {
        return gasTestProxyByUser[_] != address(0);
    }
}