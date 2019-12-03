pragma solidity ^0.5.13;

import "./IGelatoUpgradeableAction.sol";
import "./GelatoActionsStandard.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/ProxyAdmin.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/AdminUpgradeabilityProxy.sol";

contract GelatoUpgradeableActionsStandard is IGelatoUpgradeableAction,
                                             GelatoActionsStandard
{
    // non-deploy base contract
    constructor() internal {}

    ProxyAdmin internal proxysProxyAdmin;
    bool internal implementationInit;

    function askProxyForProxyAdminAddress()
        external
        view
        returns(address)
    {
        return address(proxysProxyAdmin);
    }
    function askImplementationIfInit()
        external
        view
        returns(bool)
    {
        return implementationInit;
    }

    function askProxyIfImplementationInit()
        external
        view
        returns(bool)
    {
        GelatoUpgradeableActionsStandard impl = GelatoUpgradeableActionsStandard(_askProxyForImplementationAddress());
        return impl.askImplementationIfInit();
    }

    function askProxyForImplementationAddress()
        external
        view
        returns(address)
    {
        return _askProxyForImplementationAddress();
    }

    function _askProxyForImplementationAddress()
        internal
        view
        returns(address)
    {
        return proxysProxyAdmin.getProxyImplementation(
            AdminUpgradeabilityProxy(address(uint160(address(this))))
        );
    }
}
