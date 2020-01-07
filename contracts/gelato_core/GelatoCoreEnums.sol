pragma solidity ^0.6.0;

abstract contract GelatoCoreEnums {
    enum StandardErrorCodes { NoError, CaughtError, UncaughtError }

    enum TriggerCheck { Fired, NotFired, CaughtError, UncaughtError }

    enum ActionConditionsCheck { Ok, NotOk, CaughtError, UncaughtError }

    enum CanExecuteCheck {
        WrongCalldataOrAlreadyDeleted,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerNotFired,
        CaughtTriggerError,
        UncaughtTriggerError,
        ActionConditionsNotOk,
        CaughtActionConditionsError,
        UncaughtActionConditionsError,
        Executable
    }

    enum ExecutionResult {
        CaughtActionGasError,
        CaughtActionError,
        CaughtDappError,
        CaughtUnhandledActionError,
        CaughtUnhandledUserProxyError,
        UncaughtError,
        Success
    }
}