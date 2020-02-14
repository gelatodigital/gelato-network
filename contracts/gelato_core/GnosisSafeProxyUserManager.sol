pragma solidity ^0.6.2;

import "./interfaces/IGnosisSafeProxyUserManager.sol";
import "./interfaces/IGnosisSafeProxyFactory.sol";

/// @title GnosisSafeProxyUserManager
/// @notice registry and factory for GnosisSafeProxies
/// @dev find all NatSpecs inside IGnosisSafeProxyUserManager
abstract contract GnosisSafeProxyUserManager is IGnosisSafeProxyUserManager {

    mapping(address => address) public override userByGnosisSafeProxy;
    mapping(address => IGnosisSafe) public override gnosisSafeProxyByUser;

    modifier gnosisSafeProxyUserMatch(address _gnosisSafeProxy, address _user) {
        require(
            _gnosisSafeProxy != address(0) && _user != address(0),
            "GnosisSafeProxyUserManager.gnosisSafeProxyUserMatch: no zero values allowed"
        );
        require(
            userByGnosisSafeProxy[_gnosisSafeProxy] == _user
            "GnosisSafeProxyUserManager. "
        );
    }

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
        userByGnosisSafeProxy[_gnosisSafeProxy] = msg.sender;
    }

    function registerAsGnosisSafeProxy() public override {
        address user = userByGnosisSafeProxy[msg.sender];
        require(
            user != address(0),
            "GnosisSafeProxyUserManager.registerAsProxy: Must register user of proxy first."
        );
        gnosisSafeProxyByUser[user] = IGnosisSafe(msg.sender);
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

    modifier onlyRegisteredGnosisSafeProxies {
        require(
            isRegisteredGnosisSafeProxy(msg.sender),
            "GnosisSafeProxyUserManager.onlyRegisteredGnosisSafeProxies can call."
        );
        _;
    }
}
