pragma solidity 0.6.0;

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
        returns(bool success, bytes memory returndata)
    {
        uint256 startGas = gasleft();
        (success, returndata) = address(_action).delegatecall.gas(_actionGas)(
            _actionPayloadWithSelector
        );
        if (success) revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GasTestUserProxy.executeDelegatecall: Action reverted or wrong arguments supplied");
    }
}