pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

interface IProviderModuleGnosisSafeProxy{

    event LogProvideProxyExtcodehash(bytes32 indexed extcodehash);
    event LogUnprovideProxyExtcodehash(bytes32 indexed extcodehash);

    event LogProvideMastercopy(address indexed mastercopy);
    event LogUnprovideMastercopy(address indexed mastercopy);


    // GnosisSafeProxy
    function provideProxyExtcodehash(bytes32 _hash) external;
    function unprovideProxyExtcodehash(bytes32 _hash) external;

    function provideMastercopy(address _mastercopy) external;
    function unprovideMastercopy(address _mastercopy) external;

    // Batch (un-)provide
    function batchProvide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies
    ) external;

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies
    ) external;

    function isProxyExtcodehashProvided(bytes32 _hash)
        external
        view
        returns (bool);
    function isMastercopyProvided(address _mastercopy)
        external
        view
        returns (bool);
}
