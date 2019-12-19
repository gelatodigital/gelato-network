pragma solidity ^0.6.0;

abstract contract GelatoCoreEnums {
    enum ExecutionResult {
        Success,
        CanExecuteFailed,
        ActionGasFailure,
        UndefinedActionFailure,
        DappFailure,
        UserProxyFailure,
        UndefinedFailure
    }

    enum TriggerCheck { Reverted, NotFired, Fired }

    enum ActionConditionsCheck { Reverted, NotOk, Ok }

    enum CanExecuteCheck {
        WrongCalldataOrAlreadyDeleted,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerNotFired,
        TriggerReverted,
        ActionConditionsNotOk,
        ActionReverted,
        Executable
    }
}