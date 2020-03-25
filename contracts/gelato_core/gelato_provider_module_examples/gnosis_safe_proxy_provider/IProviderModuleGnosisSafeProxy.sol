pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

interface IProviderModuleGnosisSafeProxy{
    struct ActionWithGasPriceCeil {
        address _address;
        uint256 gasPriceCeil;
    }

    event LogProvideProxyExtcodehash(bytes32 indexed extcodehash);
    event LogUnprovideProxyExtcodehash(bytes32 indexed extcodehash);

    event LogProvideMastercopy(address indexed mastercopy);
    event LogUnprovideMastercopy(address indexed mastercopy);

    event LogProvideCondition(address indexed condition);
    event LogUnprovideCondition(address indexed condition);

    event LogProvideAction(address indexed action);
    event LogUnprovideAction(address indexed action);
    event LogSetActionGasPriceCeil(
        address indexed action,
        uint256 indexed oldCeil,
        uint256 indexed newCeil
    );

    // GnosisSafeProxy
    function provideProxyExtcodehash(bytes32 _hash) external;
    function unprovideProxyExtcodehash(bytes32 _hash) external;

    function provideMastercopy(address _mastercopy) external;
    function unprovideMastercopy(address _mastercopy) external;

    // (Un-)provide Conditions
    function provideCondition(address _condition) external;
    function unprovideCondition(address _condition) external;

    // (Un-)provide Actions
    function provideAction(ActionWithGasPriceCeil calldata _action) external;
    function unprovideAction(address _action) external;
    function setActionGasPriceCeil(ActionWithGasPriceCeil calldata _action) external;

    // Batch (un-)provide
    function batchProvide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies,
        address[] calldata _conditions,
        ActionWithGasPriceCeil[] calldata _actions
    ) external;

    function batchUnprovide(
        bytes32[] calldata _hashes,
        address[] calldata _mastercopies,
        address[] calldata _conditions,
        address[] calldata _actions
    ) external;

    function isProxyExtcodehashProvided(bytes32 _hash)
        external
        view
        returns (bool);
    function isMastercopyProvided(address _mastercopy)
        external
        view
        returns (bool);
    function isConditionProvided(address _condition)
        external
        view
        returns (bool);
    function isActionProvided(address _action)
        external
        view
        returns (bool);
    function actionGasPriceCeil(address _action) external view returns (uint256);
}
