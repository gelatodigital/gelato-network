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
    using EnumerableSet for EnumerableSet.AddressSet;

    // Proxy Registries
    EnumerableSet.AddressSet private override userProxyRegistries;

    // Linked Lists for Conditions and Actions
    EnumerableSet.AddressSet private override providedConditions;
    EnumerableSet.AddressSet private override providedActions;


    // ======================= SETTERS ==============================
    function addUserProxyRegistry(address _registry) external override onlyOwner {
        require(
            userProxyRegistries.add(_registry),
            "ProviderWhitelistModule.addUserProxyRegistry: already listed"
        );
        emit LogAddUserProxyRegistry(_registry);
    }

    function removeUserProxyRegistry(address _registry) external override onlyOwner {
        require(
            userProxyRegistries.remove(_registry),
            "ProviderWhitelistModule.removeUserProxyRegistry: already not listed"
        );
        emit LogRemoveUserProxyRegistry(_registry);
    }


    function provideCondition(address _condition) external override onlyOwner {
        require(
            providedConditions.add(_condition),
            "ProviderWhitelistModule.provideCondition: already provided"
        );
        emit LogProvideCondition(_condition);
    }

    function unprovideCondition(address _condition) external override onlyOwner {
        require(
            providedConditions.remove(_condition),
            "ProviderWhitelistModule.unprovideCondition: already not provided"
        );
        emit LogUnprovideCondition(_condition);
    }

    function provideAction(address _action) external override onlyOwner {
        require(
            providedActions.add(_action),
            "ProviderWhitelistModule.provideAction: already provided"
        );
        emit LogProvideAction(_action);
    }

    function unprovideAction(address _action) external override onlyOwner {
        require(
            providedActions.remove(_action),
            "ProviderWhitelistModule.provideAction: already not provided"
        );
        emit LogUnprovideAction(_action);
    }


    // ======================= GETTERS ==============================
    function isUserProxyRegistry(address _registry) external view override returns(bool) {
        return userProxyRegistries.contains(_registry);
    }

    function isProvidedCondition(address _condition) public view override returns(bool) {
        return providedConditions.contains(_condition);
    }

    function isProvidedAction(address _action) public view override returns(bool) {
        return providedActions.contains(_action);
    }

    function getUserProxyRegistryByIndex(uint256 _index)
        public
        view
        override
        returns(address)
    {
        return userProxyRegistries.get(_index);
    }

    function getProvidedConditionByIndex(uint256 _index)
        external
        view
        override
        returns(address)
    {
        return providedConditions.get(_index);
    }

    function getProvidedActionByIndex(uint256 _index)
        external
        view
        override
        returns(address)
    {
        return providedActions.get(_index);
    }

    function getUserProxyRegistries() external view override returns(address[] memory) {
        return userProxyRegistries.enumerate();
    }

    function getProvidedConditions() external view override returns(address[] memory) {
        return providedConditions.enumerate();
    }

    function getProvidedActions() external view override returns(address[] memory) {
        return providedActions.enumerate();
    }


    // ======================= CHECK ==============================
    function isProvidedUserProxy(uint256 _userProxyRegistryIndex, bytes memory data)
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
        bytes calldata _userProxyCheckData,
        address _condition,
        address _action
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
        require(
            isProvidedCondition(_condition),
            "ProviderWhitelistModule.canMint.isProvidedCondition"
        );
        require(
            isProvidedCondition(_action),
            "ProviderWhitelistModule.canMint.isProvidedCondition"
        );
        return true;
    }
}