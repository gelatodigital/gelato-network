pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

interface IProviderModuleGelatoUserProxy{
    struct ActionWithGasPriceCeil {
        address _address;
        uint256 gasPriceCeil;
    }

    event LogProvideProxyExtcodehash(bytes32 indexed extcodehash);
    event LogUnprovideProxyExtcodehash(bytes32 indexed extcodehash);

    event LogSetActionGasPriceCeil(
        address indexed action,
        uint256 indexed oldCeil,
        uint256 indexed newCeil
    );

    // GelatoUserProxy
    function provideProxyExtcodehash(bytes32 _hash) external;
    function unprovideProxyExtcodehash(bytes32 _hash) external;

    // Action Gas Price Ceils
    function setActionGasPriceCeil(ActionWithGasPriceCeil calldata _action) external;

    // Batch (un-)provide
    function batchProvide(
        bytes32[] calldata _hashes,
        ActionWithGasPriceCeil[] calldata _actions
    )
        external;

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _actions
    )
        external;

    function isProxyExtcodehashProvided(bytes32 _hash)
        external
        view
        returns (bool);

    function actionGasPriceCeil(address _action) external view returns (uint256);
}
