pragma solidity ^0.6.4;

interface IGelatoProviderModule {
    function isProvided(address _userProxy, address _condition, address _action)
        external
        view
        returns (bool);
}
