pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
import { Action, Operation, Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
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

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execGelatoAction(Action calldata _action)
        external
        payable
        override
        auth
    {
        if (_action.operation == Operation.Call) {
            try _action.inst.action{value: msg.value}(
                _action.data.length % 32 == 4 ? _action.data[4:] : _action.data
            ) {
            } catch Error(string memory err) {
                revert(
                    string(abi.encodePacked("GelatoUserProxy.execGelatoAction:call", err))
                );
            } catch {
                revert("GelatoUserProxy.execGelatoAction:call");
            }
        } else if (_action.operation == Operation.Delegatecall) {
            (bool success, bytes memory err) = address(_action.inst).delegatecall(
                _action.data
            );
            if (!success) {
                // FAILURE
                // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
                if (err.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := mload(add(0x20, err)) }
                    if (selector == 0x08c379a0) {  // Function selector for Error(string)
                        assembly { err := add(err, 68) }
                        revert(string(abi.encodePacked(
                            "GelatoUserProxy.execGelatoAction:d-call",
                            string(err)
                        )));
                    } else {
                        revert(
                            "GelatoUserProxy.execGelatoAction:d-call:NoErrorSelector"
                        );
                    }
                } else {
                    revert(
                        "GelatoUserProxy.execGelatoAction:d-call:UnexpectedReturndata"
                    );
                }
            }
        } else {
            revert("GelatoUserProxy.execGelatoAction: invalid operation");
        }
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function multiExecGelatoActions(Action[] calldata _actions)
        external
        payable
        override
        auth
    {
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call) {
                try _actions[i].inst.action{value: msg.value}(
                    _actions[i].data.length % 32 == 4 ? _actions[i].data[4:] : _actions[i].data
                ) {
                } catch Error(string memory err) {
                    revert(
                        string(abi.encodePacked(
                            "GelatoUserProxy.multiExecGelatoActions:call", err
                        ))
                    );
                } catch {
                    revert("GelatoUserProxy.multiExecGelatoActions:call");
                }
            } else if (_actions[i].operation == Operation.Delegatecall) {
                (bool success, bytes memory err) = address(_actions[i].inst).delegatecall(
                    _actions[i].data
                );
                if (!success) {
                    // FAILURE
                    // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
                    if (err.length % 32 == 4) {
                        bytes4 selector;
                        assembly { selector := mload(add(0x20, err)) }
                        if (selector == 0x08c379a0) {  // Function selector for Error(string)
                            assembly { err := add(err, 68) }
                            revert(string(abi.encodePacked(
                                "GelatoUserProxy.multiExecGelatoActions:d-call",
                                string(err)
                            )));
                        } else {
                            revert(
                                "GelatoUserProxy.multiExecGelatoActions:d-call:NoErrorSelector"
                            );
                        }
                    } else {
                        revert(
                            "GelatoUserProxy.multiExecGelatoActions:d-call:UnexpectedReturndata"
                        );
                    }
                }
            } else {
                revert("GelatoUserProxy.multiExecGelatoActions: invalid operation");
            }
        }
    }

    function callAction(Action memory _action)
        public
        payable
        override
        auth
        noZeroAddress(address(_action.inst))
    {
        (bool success, bytes memory err) = address(_action.inst).call{value: msg.value}(
            _action.data
        );
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
            if (err.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, err)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { err := add(err, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.callAction:",
                        string(err)
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
}