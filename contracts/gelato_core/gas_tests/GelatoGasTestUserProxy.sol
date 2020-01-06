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
        returns(uint8 executionResult, uint8 actionErrorCode)
    {
        uint256 startGas = gasleft();

        if (gasleft() < _actionGas + 500) {
            revert("GelatoGasTestUserProxy.executeDelegatecall: gasleft < _actionGas");
        }

        // Low level try / catch (fails if gasleft() < _actionGas)
        (bool success,
         bytes memory returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );

        // Uncaught errors during action execution
        if (!success) {
            // An uncaught error occured during action.delegatecall frame (no error code)
            revert("GelatoGasTestUserProxy.executeDelegatecall: uncaught action error");
        } else {
            // Success or caught errors during action execution
            (executionResult, actionErrorCode) = abi.decode(returndata, (uint8,uint8));

            if (executionResult == uint8(GelatoCoreEnums.ExecutionResult.Success)) {
                // Successful Execution! (no actionErrorCode)
                revert(string(abi.encodePacked(startGas - gasleft())));
            }
            // Failure! But identifiable executionResult and actionErrorCode, which are
            //  returned to the calling frame (gelatoCore._executeActionViaUserProxy())
            revert(string(abi.encodePacked(startGas - gasleft())));
        }
    }
}