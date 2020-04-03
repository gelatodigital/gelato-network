pragma solidity ^0.6.4;

interface IProviderModuleGelatoUserProxy{
    event LogProvideProxyExtcodehash(bytes32 indexed extcodehash);
    event LogUnprovideProxyExtcodehash(bytes32 indexed extcodehash);

    function provideProxyExtcodehashes(bytes32[] calldata _hashes) external;
    function unprovideProxyExtcodehashes(bytes32[] calldata _hashes) external;

    function isProxyExtcodehashProvided(bytes32 _hash)
        external
        view
        returns (bool);
}
