pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
import { Action, Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../gelato_actions/IGelatoAction.sol";

contract GelatoUserProxy is IGelatoUserProxy {
    address public override user;
    address public override gelatoCore;

    modifier noZeroAddress(address _) {
        require(_ != address(0), "GelatoUserProxy.noZeroAddress");
        _;
    }

    modifier onlyUser() {
        require(msg.sender == user, "GelatoUserProxy.onlyUser: failed");
        _;
    }

    modifier auth() {
        require(
            msg.sender == user || msg.sender == gelatoCore,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    constructor(address _user, address _gelatoCore)
        public
        payable
        noZeroAddress(_user)
        noZeroAddress(_gelatoCore)
    {
        user = _user;
        gelatoCore = _gelatoCore;
    }

    fallback() external payable {}

    function mintExecClaim(Task calldata _task) external override onlyUser {
        IGelatoCore(gelatoCore).mintExecClaim(_task);
    }

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable
        override
        onlyUser
    {
        IGelatoCore(gelatoCore).mintSelfProvidedExecClaim{value: msg.value}(_task, _executor);
    }

    function callAction(Action memory _action)
        public
        payable
        override
        auth
        noZeroAddress(_action.addr)
    {
        (bool success, bytes memory revertReason) = _action.addr.call{value: msg.value}(
            _action.data
        );
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
            if (revertReason.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, revertReason)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { revertReason := add(revertReason, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.callAction:",
                        string(revertReason)
                    )));
                } else {
                    revert("GelatoUserProxy.callAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.callAction:UnexpectedReturndata");
            }
        }
    }

    function multiCallActions(Action[] memory _actions) public payable override auth {
        for (uint i = 0; i < _actions.length; i++) callAction(_actions[i]);
    }

    function callGelatoAction(Action calldata _action)
        external
        payable
        override
        auth
    {
        try IGelatoAction(_action.addr).action{value: msg.value}(
            _action.data.length % 32 == 4 ? _action.data[4:] : _action.data
        ) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("GelatoUserProxy.callGelatoAction:", error)));
        } catch {
            revert("GelatoUserProxy.callGelatoAction");
        }
    }

    function multiCallGelatoActions(Action[] calldata _actions)
        external
        payable
        override
        auth
    {
        for(uint i = 0; i < _actions.length; i++) {
            try IGelatoAction(_actions[i].addr).action{value: msg.value}(
                _actions[i].data.length % 32 == 4 ? _actions[i].data[4:] : _actions[i].data
            ) {
            } catch Error(string memory error) {
                revert(string(
                    abi.encodePacked("GelatoUserProxy.multiCallGelatoActions:", error)
                ));
            } catch {
                revert("GelatoUserProxy.multiCallGelatoActions");
            }
        }
    }

    function delegatecallAction(Action memory _action)
        public
        payable
        override
        auth
        noZeroAddress(_action.addr)
    {
        (bool success, bytes memory revertReason) = _action.addr.delegatecall(_action.data);
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
            if (revertReason.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, revertReason)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { revertReason := add(revertReason, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.delegatecallAction:",
                        string(revertReason)
                    )));
                } else {
                    revert("GelatoUserProxy.delegatecallAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.delegatecallAction:UnexpectedReturndata");
            }
        }
    }

    function multiDelegatecallActions(Action[] memory _actions)
        public
        payable
        override
        auth
    {
        for(uint i = 0; i < _actions.length; i++) delegatecallAction(_actions[i]);
    }

}