pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxyFactory } from "./interfaces/IGelatoUserProxyFactory.sol";
import { Address } from "../../external/Address.sol";
import { GelatoUserProxy } from "./GelatoUserProxy.sol";
import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    address public immutable override gelatoCore;

    mapping(address => GelatoUserProxy) public override gelatoProxyByUser;
    mapping(GelatoUserProxy => address) public override userByGelatoProxy;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // create
    function create(Task[] calldata _optionalSubmitTasks, Action[] calldata _optionalActions)
        external
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(
            msg.sender,
            gelatoCore,
            _optionalSubmitTasks,
            _optionalActions
        );
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[userProxy] = msg.sender;
        emit LogCreation(msg.sender, userProxy);
    }

    function isGelatoUserProxy(address _proxy) public view override returns(bool) {
        return userByGelatoProxy[GelatoUserProxy(payable(_proxy))] != address(0);
    }

    function isGelatoProxyUser(address _user) public view override returns(bool) {
        return gelatoProxyByUser[_user] != GelatoUserProxy(0);
    }
}