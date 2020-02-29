pragma solidity ^0.6.2;

import "../interfaces/IGelatoProviderModule.sol";
import "./IProviderWhitelistModule.sol";
import "../../external/Ownable.sol";
import "../../external/EnumerableSet.sol";
import "../GelatoUserProxyFactory.sol";

/// @title BasicProviderModule
/// @notice An example provider module that whitelists condition action pairs
abstract contract ProviderWhitelistModule is IGelatoProviderModule,
                                             IProviderWhitelistModule,
                                             Ownable
{
    // Proxy Registries
    mapping(address => bytes4) public override providedUserProxyRegistrySelector;

    modifier providedUserProxyRegistry(address _registry) {
        require(
            providedUserProxyRegistrySelector[_registry] != bytes4(0),
            "ProviderWhitelistModule.providedUserProxyRegistry"
        );
        _;
    }

    function provideUserProxyRegistry(address _registry, bytes4 _selector)
        external
        override
        onlyOwner
    {
        require(
            providedUserProxyRegistrySelector != bytes4(0),
            "ProviderWhitelistModule.provideUserProxyRegistry"
        );
        providedUserProxyRegistrySelector[_registry] = _selector;
        emit LogProvideUserProxyRegistry(_registry, _selector);
    }

    function unprovideUserProxyRegistry(address _registry) external override onlyOwner {
        require(
            !isProvidedUserProxyRegistry,
            "ProviderWhitelistModule.unprovideUserProxyRegistry"
        );
        isProvidedUserProxyRegistry[_registry] = false;
        emit LogUnprovideUserProxyRegistry(_registry);
    }

    // ======================= CHECK ==============================
    function isProvidedUserProxy(address _userProxy)
        public
        view
        override
        returns(bool)
    {
        address userProxyRegistry = getUserProxyRegistryByIndex(_userProxyRegistryIndex);
        require(
            userProxyRegistry != address(0),
            "ProviderWhitelistModule.userProxyCheck: invalid _userProxyRegistryIndex"
        );
        (bool success, bytes memory returndata) = userProxyRegistry.staticcall(data);
        if (!success) {
            revert("ProviderWhitelistModule.userProxyCheck: call failed");
        } else {
            bool proxyOk = abi.decode(returndata, (bool));
            if (proxyOk) return true;
            else return false;
        }
    }


    // ======================= GELATO STANDARD ==============================
    function canMint(
        uint256 _userProxyRegistryIndex,
        bytes calldata _userProxyCheckData
    )
        external
        view
        override
        returns (bool)
    {
        require(
            userProxyCheck(_userProxyRegistryIndex, _userProxyCheckData),
            "ProviderWhitelistModule.canMint.userProxyCheck"
        );
        return true;
    }
}