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
        returns(uint8 executionResult, uint8 actionErrorCode)
    {
        // Halt execution, if insufficient actionGas is sent
        if (gasleft() < _actionGas + 500) {
            return (uint8(GelatoCoreEnums.ExecutionResult.InsufficientActionGas), 0);
        }

        // Low level try / catch (fails if gasleft() < _actionGas)
        (bool success,
         bytes memory returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );

        // Uncaught errors during action execution
        if (!success) {
            // An uncaught error occured during action.delegatecall frame (no error code)
            return (uint8(GelatoCoreEnums.ExecutionResult.UndefinedActionFailure), 0);
        } else {
            // Success or caught errors during action execution
            (executionResult, actionErrorCode) = abi.decode(returndata, (uint8,uint8));

            if (executionResult == uint8(GelatoCoreEnums.ExecutionResult.Success)) {
                // Successful Execution! (no actionErrorCode)
                return (uint8(GelatoCoreEnums.ExecutionResult.Success), 0);
            }
            // Failure! But identifiable executionResult and actionErrorCode, which get
            //  returned to the calling frame (gelatoCore._executeActionViaUserProxy())
        }
    }

    function getUser() external view override returns(address) {return user;}

    function getGelatoCore() external view override returns(address) {return gelatoCore;}
}