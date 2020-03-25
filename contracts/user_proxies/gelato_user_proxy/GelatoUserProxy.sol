pragma solidity ^0.6.0;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
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

    receive() external payable {}

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

    function callAccount(address _account, bytes calldata _payload)
        external
        payable
        override
        onlyUser
        noZeroAddress(_account)
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = _account.call{ value: msg.value }(_payload);
    }

    function delegatecallAccount(address _account, bytes calldata _payload)
        external
        payable
        override
        onlyUser
        noZeroAddress(_account)
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = _account.delegatecall(_payload);
    }

    function callGelatoAction(IGelatoAction _action, bytes calldata _actionPayload)
        external
        payable
        override
        auth
        noZeroAddress(address(_action))
    {
        try _action.action{value: msg.value}(_actionPayload) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("GelatoUserProxy.delegateCallAction:", error)));
        } catch {
            revert("GelatoUserProxy.delegateCallAction");
        }
    }

    function delegatecallGelatoAction(address _action, bytes calldata _actionPayload)
        external
        payable
        override
        auth
        noZeroAddress(_action)
    {
        (bool success, bytes memory revertReason) = _action.delegatecall(_actionPayload);
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
            if (revertReason.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, revertReason)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { revertReason := add(revertReason, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.delegatecallGelatoAction:",
                        string(revertReason)
                    )));
                } else {
                    revert("GelatoUserProxy.delegatecallGelatoAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.delegatecallGelatoAction:UnexpectedReturndata");
            }
        }
    }
}