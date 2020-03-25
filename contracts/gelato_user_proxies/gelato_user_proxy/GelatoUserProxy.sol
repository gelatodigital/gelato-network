pragma solidity ^0.6.0;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
import { IGelatoAction } from "../../gelato_actions/IGelatoAction.sol";

contract GelatoUserProxy is IGelatoUserProxy {
    address public override user;
    address public override gelatoCore;

    constructor(address _user, address _gelatoCore)
        public
        noZeroAddress(_user)
        noZeroAddress(_gelatoCore)
    {
        user = _user;
        gelatoCore = _gelatoCore;
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
        (success, returndata) = _account.call(_payload);
        require(success, "GelatoUserProxy.call(): failed");
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
        require(success, "GelatoUserProxy.delegatecall(): failed");
    }

    function delegatecallGelatoAction(IGelatoAction _action, bytes calldata _actionPayload)
        external
        payable
        override
        virtual
        auth
        noZeroAddress(address(_action))
    {
        try _action.action(_actionPayload) {
        } catch Error(string memory error) {
            revert(string(abi.encodePacked("GelatoUserProxy.delegateCallAction:", error)));
        } catch {
            revert("GelatoUserProxy.delegateCallAction");
        }
    }
}