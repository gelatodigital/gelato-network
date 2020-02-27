pragma solidity ^0.6.2;

interface IGelatoProviderModule {

    function canMint(
        uint256 _userProxyRegistryIndex,
        bytes calldata _userProxyCheckData,
        address _condition,
        address _action
    )
        external
        view
        returns (bool);
}
