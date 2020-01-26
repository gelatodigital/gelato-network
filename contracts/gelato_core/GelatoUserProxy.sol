pragma solidity ^0.6.0;

import "./interfaces/IGelatoUserProxy.sol";
import "../actions/IGelatoAction.sol";

/// @title GelatoUserProxy
/// @dev find all NatSpecs inside IGelatoUserProxy
contract GelatoUserProxy is IGelatoUserProxy {
    address public override user;
    address public override gelatoCore;

    constructor(address _user)
        public
        noZeroAddress(_user)
    {
        user = _user;
        gelatoCore = msg.sender;
    }

    modifier onlyUser() {
        require(
            msg.sender == user,
            "GelatoUserProxy.onlyUser: failed"
        );
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
        require(
            _ != address(0),
            "GelatoUserProxy.noZeroAddress"
        );
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

    function delegatecallGelatoAction(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        payable
        override
        virtual
        auth
        noZeroAddress(address(_action))
    {
        // Return if insufficient actionGas (+ 210000 gas overhead buffer) is sent
        if (gasleft() < _actionGas + 21000) revert("GelatoUserProxy: ActionGasNotOk");
        // No try/catch, in order to bubble up action revert messages
        (bool success,
         bytes memory revertReason) = address(_action).delegatecall.gas(_actionGas)(
             _actionPayloadWithSelector
        );
        assembly {
            revertReason := add(revertReason, 68)
        }
        if (!success) revert(string(revertReason));
    }
}