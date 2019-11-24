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

    ProxyAdmin internal itsProxyAdmin;

    function getItsProxyAdmin()
        external
        view
        returns(address)
    {
        return address(itsProxyAdmin);
    }

    function getItsImplementation()
        external
        view
        returns(address)
    {
        return itsProxyAdmin.getProxyImplementation(
            AdminUpgradeabilityProxy(address(uint160(address(this))))
        );
    }
}
