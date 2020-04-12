pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
import { Action, Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../gelato_actions/IGelatoAction.sol";

contract GelatoUserProxy is IGelatoUserProxy {
    address public override user;
    address public override gelatoCore;

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

    modifier noZeroAddress(address _) {
        require(_ != address(0), "GelatoUserProxy.noZeroAddress");
        _;
    }

    function mintExecClaim(Task calldata _task) external override onlyUser {
        IGelatoCore(gelatoCore).mintExecClaim(_task);
    }

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable
        override
        onlyUser
    {
        IGelatoCore(gelatoCore).mintSelfProvidedExecClaim(_task, _executor);
    }

    function getSlice(uint256 begin, uint256 end, bytes memory _calldata) public pure returns (bytes memory) {
        bytes memory a = new bytes(end-begin+1);
        for(uint i=0; i<=end-begin; i++){
            a[i] = bytes(_calldata)[i + begin - 1];
        }
        return a;
    }

    function callGelatoAction(IGelatoAction _action, bytes memory _actionPayload)
        public
        payable
        override
        auth
        noZeroAddress(address(_action))
    {
       try _action.action{value: msg.value}(
            _actionPayload.length % 32 == 4 ? getSlice(4, _actionPayload.length, _actionPayload) : _actionPayload
        ) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("GelatoUserProxy.delegateCallAction:", error)));
        } catch {
            revert("GelatoUserProxy.delegateCallAction");
        }
    }

    function multiGelatoCallAction(IGelatoAction[] calldata _accounts, bytes[] calldata _payloads)
        external
        override
        auth
    {
        require(_accounts.length == _payloads.length, "GelatoUserProxy.multiCallAction:LengthNotCorrect");
        for(uint i = 0; i < _accounts.length; i++) {
            callGelatoAction(_accounts[i], _payloads[i]);
        }
    }

    function delegatecallAction(address _account, bytes memory _payload)
        public
        payable
        override
        auth
        noZeroAddress(_account)
    {
        (bool success, bytes memory revertReason) = _account.delegatecall(_payload);
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

    function multiDelegatecallAction(Action[] calldata _actions)
        external
        override
        auth
    {
        for(uint i = 0; i < _actions.length; i++)
            delegatecallAction(_actions[i].addr, _actions[i].data);
    }


    function callAction(address _account, bytes memory _payload)
        public
        payable
        override
        auth
        noZeroAddress(_account)
    {
        (bool success, bytes memory revertReason) = _account.call{ value: msg.value }(_payload);
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

    function multiCallAction(address[] calldata _accounts, bytes[] calldata _payloads)
        external
        override
        auth
    {
        require(_accounts.length == _payloads.length, "GelatoUserProxy.multiCallAction:LengthNotCorrect");
        for(uint i = 0; i < _accounts.length; i++) {
            callAction(_accounts[i], _payloads[i]);
        }
    }


}