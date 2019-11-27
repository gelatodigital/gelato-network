pragma solidity ^0.5.10;

contract GelatoCoreEnums {
    enum ExecutionResult {
        Success,
        Failure,
        CanExecuteFailed
    }

    enum CanExecuteCheck {
        WrongCalldataOrAlreadyDeleted,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerReverted,
        TriggerNotFired,
        ActionReverted,
        ActionConditionsNotOk,
        Executable
    }
}