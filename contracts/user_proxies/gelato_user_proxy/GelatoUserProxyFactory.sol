pragma solidity ^0.6.6;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { GelatoUserProxy } from "./GelatoUserProxy.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    address public override gelatoCore;
    mapping(address => GelatoUserProxy) public override gelatoProxyByUser;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // create
    function create()
        external
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(msg.sender, gelatoCore);
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogCreation(msg.sender, userProxy);
    }

    /// @dev create2: uses tx.origin so setup scripts can run before this call.
    ///  This however means that contract accounts are excluded from creating a
    ///  safe GelatoUserProxy by using create2.
    function createTwo(uint256 _saltNonce)
        external
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        // Standard Way of deriving salt
        bytes32 salt = keccak256(abi.encode(tx.origin, _saltNonce));
        // Deploy userProxy with create2
        userProxy = new GelatoUserProxy{salt: salt, value: msg.value}(tx.origin, gelatoCore);
        require(
            address(userProxy) == predictProxyAddress(tx.origin, _saltNonce),
            "GelatoUserProxyFactory.createTwo: wrong address prediction"
        );
        gelatoProxyByUser[tx.origin] = userProxy;
        // Success
        emit LogCreation(tx.origin, userProxy);
    }

    function predictProxyAddress(address _user, uint256 _saltNonce)
        public
        view
        override
        returns(address)
    {
        // Standard Way of deriving salt
        bytes32 salt = keccak256(abi.encode(tx.origin, _saltNonce));
        // Derive undeployed userProxy address
        return address(uint(keccak256(abi.encodePacked(
            byte(0xff),
            address(this),
            salt,
            keccak256(abi.encodePacked(proxyCreationCode(), _user, gelatoCore))
        ))));
    }

    function proxyCreationCode() public pure override returns(bytes memory) {
        return type(GelatoUserProxy).creationCode;
    }

    function proxyRuntimeCode() public pure override returns(bytes memory) {
        return type(GelatoUserProxy).runtimeCode;
    }

    function proxyExtcodehash() external pure override returns(bytes32) {
        return keccak256(proxyRuntimeCode());
    }
}