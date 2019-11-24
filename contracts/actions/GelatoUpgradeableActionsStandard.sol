pragma solidity ^0.5.10;

import "./IGelatoUpgradeableAction.sol";
import "./GelatoActionsStandard.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/ProxyAdmin.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";

contract GelatoUpgradeableActionsStandard is IGelatoUpgradeableAction,
                                             GelatoActionsStandard
{
    /// @dev non-deploy base contract
    constructor() internal {}

    ProxyAdmin internal myProxyAdmin;

    function getMyProxyAdminAddress() external view returns(address) {return address(myProxyAdmin);}

    function _getMyImplementationAddress()
        internal
        view
        returns(address)
    {
        return myProxyAdmin.getProxyImplementation(
            AdminUpgradeabilityProxy(address(uint160(address(this))))
        );
    }

    function getMyImplementationAddress()
        external
        view
        returns(address)
    {
        return _getMyImplementationAddress();
    }
}
