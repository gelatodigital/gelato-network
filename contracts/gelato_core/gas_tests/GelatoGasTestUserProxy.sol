pragma solidity ^0.6.0;

import "../GelatoUserProxy.sol";

contract GelatoGasTestUserProxy is GelatoUserProxy {

    constructor(address payable _user) public GelatoUserProxy(_user) {}

    function delegatecallGelatoAction(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        payable
        override
        auth
        noZeroAddress(address(_action))
    {
        uint256 startGas = gasleft();

        // Return if insufficient actionGas (+ 210000 gas overhead buffer) is sent
        if (gasleft() < _actionGas + 21000)
            revert("GelatoGasTestUserProxy.delegatecallGelatoAction: actionGas failed");

        // Low level try / catch (fails if gasleft() < _actionGas)
        (bool success,
         bytes memory revertReason) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );
        // Unhandled errors during action execution
        if (!success) {
            // error during action execution
            revertReason;  // silence compiler warning
            revert("GelatoGasTestUserProxy.delegatecallGelatoAction: unhandled error");
        } else { // success
            revert(string(abi.encodePacked(startGas - gasleft())));
        }
    }
}