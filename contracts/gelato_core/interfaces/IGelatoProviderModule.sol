pragma solidity ^0.6.2;

interface IGelatoProviderModule {

    function canMint(
        address _userProxy,
        uint8 _userProxyType,
        address _condition,
        address _action
    )
        external
        view
        returns (bool);
}
