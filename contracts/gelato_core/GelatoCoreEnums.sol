pragma solidity ^0.6.0;

abstract contract GelatoCoreEnums {

    enum CanExecuteResult {
        WrongCalldataOrAlreadyDeleted,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerNotOk,
        UnhandledTriggerError,
        ActionConditionsNotOk,
        UnhandledActionConditionsError,
        Executable
    }

    enum ExecutionResult {
        InsufficientActionGas,
        ActionNotOk,  // Mostly for caught/handled action errors
        DappNotOk,  // Mostly for caught/ dapp errors (on/by action)
        UnhandledActionError,
        UnhandledUserProxyError,
        Success
    }

    enum StandardReason { Ok, NotOk, UnhandledError }
}