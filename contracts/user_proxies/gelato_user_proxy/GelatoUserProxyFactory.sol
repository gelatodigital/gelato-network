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

    // create: public due to UnimplementedFeatureError structs
    function create(Task[] memory _optionalSubmitTasks, Action[] memory _optionalActions)
        public
        payable
        override
        returns(GelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy{value: msg.value}(msg.sender, gelatoCore);
        gelatoProxyByUser[msg.sender] = userProxy;
        userByGelatoProxy[userProxy] = msg.sender;
        if (_optionalSubmitTasks.length != 0) _submitTasks(userProxy, _optionalSubmitTasks);
        if (_optionalActions.length != 0) _execActions(userProxy, _optionalActions);
        emit LogCreation(msg.sender, userProxy);
    }

    function isGelatoUserProxy(address _proxy) public view override returns(bool) {
        return userByGelatoProxy[GelatoUserProxy(payable(_proxy))] != address(0);
    }

    function isGelatoProxyUser(address _user) public view override returns(bool) {
        return gelatoProxyByUser[_user] != GelatoUserProxy(0);
    }

    function _submitTasks(GelatoUserProxy _userProxy, Task[] memory _tasks) private {
        try _userProxy.multiSubmitTasks(_tasks) {
        } catch Error(string memory err) {
            revert(
                string(
                    abi.encodePacked(
                        "GelatoUserProxyFactory._initialize._submitTasks:", err
                    )
                )
            );
        } catch {
            revert("GelatoUserProxyFactory._initialize._submitTasks:undefined");
        }
    }

    function _execActions(GelatoUserProxy _userProxy, Action[] memory _actions) private {
        try _userProxy.multiExecActions(_actions) {
        } catch Error(string memory err) {
            revert(
                string(
                    abi.encodePacked(
                        "GelatoUserProxyFactory._initialize._execActions:", err
                    )
                )
            );
        } catch {
            revert("GelatoUserProxyFactory._initialize._execActions:undefined");
        }
    }
}