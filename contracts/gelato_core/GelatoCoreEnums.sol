pragma solidity 0.6.0;

contract GelatoCoreEnums {
    constructor() internal {}

    enum ExecutionResult { Success, Failure, CanExecuteFailed }

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