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

    ProxyAdmin internal actionProxyAdmin;

    function getActionProxyAdmin()
        external
        view
        returns(address)
    {
        return address(actionProxyAdmin);
    }

    function getActionImplementation(address payable _actionProxy)
        external
        view
        returns(address)
    {
        return actionProxyAdmin.getProxyImplementation(
            AdminUpgradeabilityProxy(_actionProxy)
        );
    }
}
