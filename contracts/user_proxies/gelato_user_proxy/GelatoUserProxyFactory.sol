pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { GelatoUserProxy } from "./GelatoUserProxy.sol";
import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    // Make this immutable after solidity coverage
    address public override gelatoCore;

    mapping(address => GelatoUserProxy) public override gelatoProxyByUser;
    // make this after coverage:
    //  mapping(GelatoUserProxy => address) public override userByGelatoProxy;
    mapping(address => address) public override userByGelatoProxy;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // create
    function create(Task[] calldata _optionalMintTasks, Action[] calldata _optionalActions)
        external
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(
            msg.sender,
            gelatoCore,
            _optionalMintTasks,
            _optionalActions
        );
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[address(userProxy)] = msg.sender;
        emit LogCreation(msg.sender, userProxy);
    }

    function isGelatoUserProxy(address _proxy) public view override returns(bool) {
        return userByGelatoProxy[_proxy] != address(0);
    }

    function isGelatoProxyUser(address _user) public view override returns(bool) {
        return gelatoProxyByUser[_user] != GelatoUserProxy(0);
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