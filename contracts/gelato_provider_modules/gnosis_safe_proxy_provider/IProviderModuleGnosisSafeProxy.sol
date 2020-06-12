// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IProviderModuleGnosisSafeProxy{
    event LogProvideProxyExtcodehash(bytes32 indexed extcodehash);
    event LogUnprovideProxyExtcodehash(bytes32 indexed extcodehash);

    event LogProvideMastercopy(address indexed mastercopy);
    event LogUnprovideMastercopy(address indexed mastercopy);

    // GnosisSafeProxy
    function provideProxyExtcodehashes(bytes32[] calldata _hashes) external;
    function unprovideProxyExtcodehashes(bytes32[] calldata _hashes) external;

    function provideMastercopies(address[] calldata _mastercopies) external;
    function unprovideMastercopies(address[] calldata _mastercopies) external;

    // Batch (un-)provide
    function multiProvide(bytes32[] calldata _hashes, address[] calldata _mastercopies)
        external;

    function multiUnprovide(bytes32[] calldata _hashes, address[] calldata _mastercopies)
        external;

    function isProxyExtcodehashProvided(bytes32 _hash)
        external
        view
        returns(bool);
    function isMastercopyProvided(address _mastercopy)
        external
        view
        returns(bool);


    function gelatoCore() external pure returns(address);
    function gelatoActionPipeline() external pure returns(address);
}
