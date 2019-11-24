pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/upgradeability/ProxyAdmin.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";

contract GelatoUpgradeableScriptsBase
{
    /// @dev non-deploy base contract
    constructor() internal {}

    ProxyAdmin internal myProxyAdmin;

    function getMyProxyAdmin() external view returns(ProxyAdmin) {return myProxyAdmin;}

    function _getMyImplementation()
        internal
        view
        returns(address)
    {
        return myProxyAdmin.getProxyImplementation(
            AdminUpgradeabilityProxy(address(uint160(address(this))))
        );
    }

    function getMyImplementation()
        external
        view
        returns(address)
    {
        return _getMyImplementation();
    }
}
