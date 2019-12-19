pragma solidity ^0.6.0;

import "./interfaces/IGelatoUserProxy.sol";
import "../actions/GelatoActionsStandard.sol";

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

    function executeCall(
        address _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable
        override
        virtual
        onlyUser
        noZeroAddress(_action)
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = _action.call(_actionPayloadWithSelector);
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.executeCall(): _action.call failed");
    }

    function executeDelegatecall(
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
        returns(uint8 executionResult, uint8 errorCode)
    {
        // Low level try / catch
        (bool success,
         bytes memory returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );

        // Action reverted: Find out why
        if (!success) {
            // We return known errors to the calling frame (gelatoCore._executeActionViaUserProxy())
            (executionResult, errorCode) = abi.decode(returndata, (uint8,uint8));
            // Unless
            if (
                executionResult != uint8(GelatoCoreEnums.ExecutionResult.DefinedActionFailure)
                && executionResult != uint8(GelatoCoreEnums.ExecutionResult.DappFailure)
            ) {
                // An unknown error occured during action.delegatecall frame (no error code)
                return (uint8(GelatoCoreEnums.ExecutionResult.UndefinedActionFailure), 0);
            }
            // we return the identified Error to the calling frame (gelatoCore._executeActionViaUserProxy())
            return (executionResult, errorCode);
        }

        // Success! (no error code)
        return (uint8(GelatoCoreEnums.ExecutionResult.Success), 0);
    }

    function getUser() external view override returns(address) {return user;}

    function getGelatoCore() external view override returns(address) {return gelatoCore;}
}