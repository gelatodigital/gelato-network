pragma solidity ^0.6.0;

import "./interfaces/IGelatoUserProxy.sol";
import "../actions/IGelatoAction.sol";

/// @title GelatoUserProxy
/// @dev find all NatSpecs inside IGelatoUserProxy
contract GelatoUserProxy is IGelatoUserProxy {
    address internal user;
    address internal gelatoCore;

    constructor(address payable _user)
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

    function call(address _account, bytes calldata _payload)
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

    function delegatecall(address _account, bytes calldata _payload)
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
        returns(uint8 executionResult, uint8 reason)
    {
        // Return if insufficient actionGas (+ 210000 gas overhead buffer) is sent
        if (gasleft() < _actionGas + 21000) {
            return (
                uint8(GelatoCoreEnums.ExecutionResult.InsufficientActionGas),
                uint8(GelatoCoreEnums.StandardReason.NotOk)
            );
        }
        // Low level try / catch (fails if gasleft() < _actionGas)
        (bool success,
         bytes memory returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );
        return _handleGelatoActionReturndata(success, returndata);
    }

    function _handleGelatoActionReturndata(bool success, bytes memory returndata)
        internal
        pure
        returns(uint8 executionResult, uint8 reason)
    {
        // Unhandled errors during action execution
        if (!success) {
            // An unhandled error occured during action.delegatecall frame
            return (
                uint8(GelatoCoreEnums.ExecutionResult.UnhandledActionError),
                uint8(GelatoCoreEnums.StandardReason.UnhandledError)
            );
        } else {
            // Success OR caught errors during action execution
            (executionResult, reason) = abi.decode(returndata, (uint8,uint8));

            // If (Success)
            if (executionResult == uint8(GelatoCoreEnums.ExecutionResult.Success)) {
                // Success!
                return (
                    uint8(GelatoCoreEnums.ExecutionResult.Success),
                    uint8(GelatoCoreEnums.StandardReason.Ok)
                );
            }
            // Else: Failure! But handled executionResult and reason, are returned
            //   to the calling frame (gelatoCore._executeActionViaUserProxy())
            // If implemented correctly, executionResult must be one of:
            //   - ActionNotOk or DappNotOk
        }
    }

    function getUser() external view override returns(address) {return user;}
    function getGelatoCore() external view override returns(address) {return gelatoCore;}
}