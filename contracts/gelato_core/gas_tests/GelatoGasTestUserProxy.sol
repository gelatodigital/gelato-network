pragma solidity ^0.6.0;

import "../GelatoUserProxy.sol";

contract GelatoGasTestUserProxy is GelatoUserProxy {

    constructor(address payable _user) public GelatoUserProxy(_user) {}

    function executeDelegatecall(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        payable
        override
        auth
        noZeroAddress(address(_action))
        returns(uint8 executionResult, uint8 errorCode)
    {
        uint256 startGas = gasleft();

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
                revert(string(abi.encodePacked(startGas - gasleft())));
            }
            // we return the identified Error to the calling frame (gelatoCore._executeActionViaUserProxy())
             revert(string(abi.encodePacked(startGas - gasleft())));
        }

        // Success! (no error code)
        revert(string(abi.encodePacked(startGas - gasleft())));

        // Success! (no error code)
        revert(string(abi.encodePacked(startGas - gasleft())));
    }
}