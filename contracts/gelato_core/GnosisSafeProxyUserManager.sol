pragma solidity ^0.6.2;

import "./interfaces/IGnosisSafeProxyUserManager.sol";
import "./interfaces/IGnosisSafeProxyFactory.sol";

/// @title GnosisSafeProxyUserManager
/// @notice registry and factory for GnosisSafeProxies
/// @dev find all NatSpecs inside IGnosisSafeProxyUserManager
abstract contract GnosisSafeProxyUserManager is IGnosisSafeProxyUserManager {

    mapping(address => address) public override userByGnosisSafeProxy;
    mapping(address => IGnosisSafe) public override gnosisSafeProxyByUser;

    modifier onlyGnosisSafeProxyOwner(address _gnosisSafeProxy) {
        IGnosisSafe gnosisSafeProxy = IGnosisSafe(_gnosisSafeProxy);
        require(
            gnosisSafeProxy.isOwner(msg.sender),
            "GnosisSafeProxyUserManager.onlyGnosisSafeProxyOwner can call"
        );
        _;
    }

    function registerAsGnosisSafeProxyUser(address _gnosisSafeProxy)
        public
        override
        onlyGnosisSafeProxyOwner(_gnosisSafeProxy)
    {
        // We need to do this unless we allow 1 proxy to many users
        require(
            !isRegisteredGnosisSafeProxy(_gnosisSafeProxy),
            "GnosisSafeProxyUserManager.registerAsGnosisSafeProxyUser: proxy occupied "
        );
        userByGnosisSafeProxy[_gnosisSafeProxy] = msg.sender;
    }

    function registerAsGnosisSafeProxy() public override {
        address user = userByGnosisSafeProxy[msg.sender];
        require(
            user != address(0),  // isRegisterdUser(user)
            "GnosisSafeProxyUserManager.registerAsProxy: Must register user of proxy first."
        );
        gnosisSafeProxyByUser[user] = IGnosisSafe(msg.sender);
    }

    function createGnosisSafeProxy(address _mastercopy, bytes calldata _initializer)
        external
        override
        returns(address proxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        proxy = factory.createProxy(_mastercopy, _initializer);
        userByGnosisSafeProxy[proxy] = msg.sender; // registerAsGnosisSafeProxyUser
        gnosisSafeProxyByUser[msg.sender] = IGnosisSafe(proxy); // registerAsGnosisSafeProxy
        emit LogGnosisSafeProxyUserCreation(msg.sender, proxy);
    }

    function createGnosisSafeProxyWithNonce(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    )
        external
        override
        returns(address proxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        proxy = factory.createProxyWithNonce(_mastercopy, _initializer, _saltNonce);
        userByGnosisSafeProxy[proxy] = msg.sender; // registerAsGnosisSafeProxyUser
        gnosisSafeProxyByUser[msg.sender] = IGnosisSafe(proxy); // registerAsGnosisSafeProxy
        emit LogGnosisSafeProxyUserCreation(msg.sender, proxy);
    }

    // ______ State Read APIs __________________
    function isRegisteredUser(address _user)
        public
        view
        override
        returns(bool)
    {
        return gnosisSafeProxyByUser[_user] != IGnosisSafe(0);
    }

    function isRegisteredGnosisSafeProxy(address _gnosisSafeProxy)
        public
        view
        override
        returns(bool)
    {
        return userByGnosisSafeProxy[_gnosisSafeProxy] != address(0);
    }

    modifier onlyRegisteredGnosisSafeProxies(address _gnosisSafeProxy) {
        require(
            isRegisteredGnosisSafeProxy(_gnosisSafeProxy),
            "GnosisSafeProxyUserManager.onlyRegisteredGnosisSafeProxies can call."
        );
        _;
    }
}
