pragma solidity ^0.6.0;

abstract contract GelatoCoreEnums {

    enum CanExecuteResult {
        ExecutionClaimAlreadyExecuted,
        ExecutionClaimNonExistant,
        ExecutionClaimExpired,
        WrongCalldata,  // also returns if a not-selected executor calls fn
        TriggerNotOk,
        UnhandledTriggerError,
        ActionConditionsNotOk,
        UnhandledActionConditionsError,
        Executable
    }

    enum ExecutionResult {
        ActionGasNotOk,
        ActionNotOk,  // Mostly for caught/handled (by action) action errors
        DappNotOk,  // Mostly for caught/handled (by action) dapp errors
        UnhandledActionError,
        UnhandledUserProxyError,
        Success
    }

    enum StandardReason { Ok, NotOk, UnhandledError }
}