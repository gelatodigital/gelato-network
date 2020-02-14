pragma solidity ^0.6.2;

abstract contract GelatoCoreEnums {

    enum CanExecuteResults {
        ExecutionClaimAlreadyExecutedOrCancelled,
        ExecutionClaimNonExistant,
        ExecutionClaimExpired,
        WrongCalldata,  // also returns if a not-selected executor calls fn
        ConditionNotOk,
        UnhandledConditionError,
        Executable
    }

    // Not needed atm due to revert with string memory reason
    /* enum ExecutionResults {
        ActionGasNotOk,
        ActionNotOk,  // Mostly for caught/handled (by action) action errors
        DappNotOk,  // Mostly for caught/handled (by action) dapp errors
        UnhandledActionError,
        UnhandledUserProxyError,
        Success
    } */

    enum StandardReason { Ok, NotOk, UnhandledError }
}