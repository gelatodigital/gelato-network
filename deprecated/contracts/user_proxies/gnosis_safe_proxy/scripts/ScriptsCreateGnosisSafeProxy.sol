// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import "../interfaces/IScriptsCreateGnosisSafeProxy.sol";
import "../interfaces/IGnosisSafeProxyFactory.sol";
import "../../../external/Address.sol";

contract ScriptsCreateGnosisSafeProxy is IScriptsCreateGnosisSafeProxy {

    using Address for address payable;  /// for oz's sendValue method

    IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
        0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
    );

    // create
    function create(address _mastercopy, bytes memory _initializer)
        public
        payable
        override
        returns(address userProxy)
    {
        userProxy = address(factory.createProxy(_mastercopy, _initializer));
        if (msg.value > 0) payable(userProxy).sendValue(msg.value);
        emit LogGnosisSafeProxyCreation(msg.sender, userProxy, msg.value);
    }

    // create2
    function createTwo(address _mastercopy, bytes memory _initializer, uint256 _saltNonce)
        public
        payable
        override
        returns(address userProxy)
    {
        // Salt used by GnosisSafeProxyFactory
        bytes32 salt = keccak256(abi.encodePacked(keccak256(_initializer), _saltNonce));
        // Get GnosisSafeProxy.CreationCode used by deployed Factory
        bytes memory creationCode = factory.proxyCreationCode();

        // Derive undeployed userProxy address
        address predictedAddress = address(uint(keccak256(abi.encodePacked(
            byte(0xff),
            address(factory),
            salt,
            keccak256(abi.encodePacked(creationCode, uint256(_mastercopy)))
        ))));

        // Prefund undeployed proxy
        if (msg.value > 0) payable(predictedAddress).sendValue(msg.value);

        // Deploy userProxy with create2
        userProxy = address(factory.createProxyWithNonce(
            _mastercopy,
            _initializer,
            _saltNonce
        ));
        require(
            userProxy == predictedAddress,
            "GelatoCore.createTwoGnosisSafeProxy: wrong address prediction"
        );

        // Success
        emit LogGnosisSafeProxyCreation(msg.sender, userProxy, msg.value);
    }
}

