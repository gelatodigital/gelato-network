pragma solidity ^0.6.2;

interface IGelatoCore {
    function mintExecutionClaim(
        address[2] calldata _providerAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload
    ) external;
}
