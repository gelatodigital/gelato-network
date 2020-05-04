pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task, TaskReceipt } from "./interfaces/IGelatoCore.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";

/// @title GelatoCore
/// @author Luis Schliesske & Hilmar Orth
/// @notice Task Receipt: submission, validation, execution, charging and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoExecutors {

    using SafeMath for uint256;

    // ================  STATE VARIABLES ======================================
    // TaskReceiptIds
    uint256 public override currentTaskReceiptId;
    // taskReceipt.id => taskReceiptHash
    mapping(uint256 => bytes32) public override taskReceiptHash;
    // Task Cycle Ids
    uint256 public override currentTaskCycleId;
    // taskCycleId => cycled tasks
    mapping(uint256 => Task[]) public taskCycle;

    // ================  SUBMIT ==============================================
    function canSubmitTask(address _userProxy, Task memory _task)
        public
        view
        override
        returns(string memory)
    {
        address executor = executorByProvider[_task.provider.addr];

        // Optional Task Cycle checks: special permissions for GelatoCore && executor
        if (msg.sender != address(this) && msg.sender != executor) {
            require(
                _task.cycle.id == 0 && _task.cycle.index == 0,
                "GelatoCore.canSubmitTask: _task.cycle.id and .index must be 0"
            );
        }

        // EXECUTOR CHECKS
        if (!isExecutorMinStaked(executor)) return "GelatoCore.canSubmitTask: executorStake";

        // ExpiryDate
        else if (_task.expiryDate != 0)
            if (_task.expiryDate < now) return "GelatoCore.canSubmitTask: expiryDate";

        // Check Provider details
        string memory isProvided;
        if (_userProxy == _task.provider.addr)
            isProvided = providerModuleChecks(_userProxy, _task);
        else isProvided = isTaskProvided(_userProxy, _task);
        if (!isProvided.startsWithOk())
            return string(abi.encodePacked("GelatoCore.canSubmitTask.isProvided:", isProvided));

        // Success
        return OK;
    }

    function submitTask(Task memory _task) public override {
        // canSubmit Gate
        string memory canSubmitRes = canSubmitTask(msg.sender, _task);
        require(canSubmitRes.startsWithOk(), canSubmitRes);

        // Increment TaskReceipt ID storage
        uint256 nextTaskReceiptId = currentTaskReceiptId + 1;
        currentTaskReceiptId = nextTaskReceiptId;

        // Generate new Task Receipt
        TaskReceipt memory taskReceipt = TaskReceipt({
            id: nextTaskReceiptId,
            userProxy: msg.sender, // Smart Contract Accounts ONLY
            task: _task
        });

        // Hash TaskReceipt
        bytes32 hashedTaskReceipt = hashTaskReceipt(taskReceipt);

        // Store TaskReceipt Hash
        taskReceiptHash[taskReceipt.id] = hashedTaskReceipt;

        emit LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
    }

    function multiSubmitTasks(Task[] memory _tasks) public override {
        for (uint i; i < _tasks.length; i++) submitTask(_tasks[i]);
    }

    function submitTaskCycle(Task[] memory _tasks) public override {
        // Increment CycleID storage
        uint256 nextTaskCycleId = currentTaskCycleId + 1;
        currentTaskCycleId = nextTaskCycleId;

        // Assign CycleId and indices to all tasks of this cycle
        for (uint256 index; index < _tasks.length; index++) {
            _tasks[index].cycle.id = nextTaskCycleId;
            _tasks[index].cycle.index = index;
        }

        // Store Task Cycle ("Copying struct memory[] to storage not yet supported")
        Task[] storage _taskCycle = taskCycle[nextTaskCycleId];
        for (uint i; i < _tasks.length; i++) {
            _taskCycle[nextTaskCycleId].provider = _tasks[i].provider;
            for (uint c; c < _tasks[i].conditions.length; c++)
                _taskCycle[nextTaskCycleId].conditions[c] = _tasks[i].conditions[c];
            for (uint a; a < _tasks[i].actions.length; a++)
                _taskCycle[nextTaskCycleId].actions[a] = _tasks[i].actions[a];
            _taskCycle[nextTaskCycleId].expiryDate = _tasks[i].expiryDate;
            _taskCycle[nextTaskCycleId].autoResubmitSelf = _tasks[i].autoResubmitSelf;
            _taskCycle[nextTaskCycleId].cycle = _tasks[i].cycle;
        }

        // Start Cycle: GelatoCore based task submission permissions => external call
        this.submitTask(_tasks[0]);

        emit LogTaskCycleSubmitted(nextTaskCycleId);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(TaskReceipt memory _TR, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        public
        view
        override
        returns(string memory)
    {
        if (_execTxGasPrice != _getGelatoGasPrice()) return "ExecTxGasPriceNotGelatoGasPrice";

        if (!isProviderLiquid(_TR.task.provider.addr, _gelatoMaxGas, _execTxGasPrice))
            return "ProviderIlliquidity";

        if (_TR.userProxy != _TR.task.provider.addr) {
            string memory res = providerCanExec(_TR, _execTxGasPrice);
            if (!res.startsWithOk()) return res;
        }

        bytes32 hashedTaskReceipt = hashTaskReceipt(_TR);
        if (taskReceiptHash[_TR.id] != hashedTaskReceipt) return "InvalidTaskReceiptHash";

        if (_TR.task.expiryDate != 0 && _TR.task.expiryDate <= now) return "TaskReceiptExpired";

        // CHECK Condition for user proxies
        if (_TR.task.conditions.length != 0) {
            for (uint i; i < _TR.task.conditions.length; i++) {
                try _TR.task.conditions[i].inst.ok(_TR.task.conditions[i].data)
                    returns(string memory condition)
                {
                    if (!condition.startsWithOk())
                        return string(abi.encodePacked("ConditionNotOk:", condition));
                } catch Error(string memory error) {
                    return string(abi.encodePacked("ConditionReverted:", error));
                } catch {
                    return "ConditionReverted:undefined";
                }
            }
        }

        // CHECK Action Conditions
        for (uint i; i < _TR.task.actions.length; i++) {
            // Only check termsOk if specified, else continue
            if (!_TR.task.actions[i].termsOkCheck) continue;

            try IGelatoAction(_TR.task.actions[i].addr).termsOk(
                _TR.userProxy,
                _TR.task.actions[i].data
            )
                returns(string memory actionTermsOk)
            {
                if (!actionTermsOk.startsWithOk())
                    return string(abi.encodePacked("ActionTermsNotOk:", actionTermsOk));
            } catch Error(string memory error) {
                return string(abi.encodePacked("ActionReverted:", error));
            } catch {
                return "ActionRevertedNoMessage";
            }
        }

        // Optional chained Task auto-resubmit validation
        if (_TR.task.autoResubmitSelf) {
            string memory canResubmitSelf = canSubmitTask(_TR.userProxy, _TR.task);
            if (!canResubmitSelf.startsWithOk())
                return string(abi.encodePacked("CannotAutoResubmitSelf:", canResubmitSelf));
        }

        // Optional chained Task auto-submit validation
        if (_TR.task.cycle.id != 0) {
            uint256 nextTaskIndex;
            if (_TR.task.cycle.index == _TR.task.cycle.length - 1) nextTaskIndex = 0;
            else nextTaskIndex = _TR.task.cycle.index + 1;
            string memory canSubmitNext = canSubmitTask(
                _TR.userProxy,
                taskCycle[_TR.task.cycle.id][nextTaskIndex]
            );
            if (!canSubmitNext.startsWithOk())
                return string(abi.encodePacked("CannotAutoSubmitNextTask:", canSubmitNext));
        }

        // Executor Validation
        if (msg.sender == address(this)) return OK;
        else if (msg.sender == executorByProvider[_TR.task.provider.addr])
            return OK;
        else return "InvalidExecutor";
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutionResult { ExecSuccess, CanExecFailed, ExecRevert }
    enum ExecutorPay { Reward, Refund }

    // Execution Entry Point: tx.gasprice must be _getGelatoGasPrice()
    function exec(TaskReceipt memory _TR) public override {

        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        // CHECKS: all further checks are done during this.executionWrapper.canExec()
        require(startGas > internalGasRequirement, "GelatoCore.exec: Insufficient gas sent");
        require(
            msg.sender == executorByProvider[_TR.task.provider.addr],
            "GelatoCore.exec: Invalid Executor"
        );

        // memcopy of gelatoMaxGas, to avoid multiple storage reads
        uint256 _gelatoMaxGas = gelatoMaxGas;

        ExecutionResult executionResult;
        string memory reason;

        try this.executionWrapper{gas: gasleft() - internalGasRequirement}(_TR, _gelatoMaxGas)
            returns(ExecutionResult _executionResult, string memory _reason)
        {
            executionResult = _executionResult;
            reason = _reason;
        } catch Error(string memory error) {
            executionResult = ExecutionResult.ExecRevert;
            reason = error;
        } catch {
            // If any of the external calls in executionWrapper resulted in e.g. out of gas,
            // Executor is eligible for a Refund, but only if Executor sent gelatoMaxGas.
            executionResult = ExecutionResult.ExecRevert;
            reason = "GelatoCore.executionWrapper:undefined";
        }

        if (executionResult == ExecutionResult.ExecSuccess) {
            // END-1: SUCCESS => TaskReceipt Deletion & Reward
            delete taskReceiptHash[_TR.id];
            (uint256 executorSuccessFee, uint256 sysAdminSuccessFee) = _processProviderPayables(
                _TR.task.provider.addr,
                ExecutorPay.Reward,
                startGas,
                _gelatoMaxGas,
                tx.gasprice  // == gelatoGasPrice
            );
            emit LogExecSuccess(msg.sender, _TR.id, executorSuccessFee, sysAdminSuccessFee);

        } else if (executionResult == ExecutionResult.CanExecFailed) {
            // END-2: CanExecFailed => No TaskReceipt Deletion & No Refund
            emit LogCanExecFailed(msg.sender, _TR.id, reason);

        } else {
            // executionResult == ExecutionResult.ExecRevert
            // END-3.1: ExecReverted NO gelatoMaxGas => No TaskReceipt Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecReverted(msg.sender, _TR.id, 0, reason);
            else {
                // END-3.2: ExecReverted BUT gelatoMaxGas was used
                //  => TaskReceipt Deletion & Refund
                delete taskReceiptHash[_TR.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _TR.task.provider.addr,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                     tx.gasprice  // == gelatoGasPrice
                );
                emit LogExecReverted(msg.sender, _TR.id, executorRefund, reason);
            }
        }
    }

    // Used by GelatoCore.exec(), to handle Out-Of-Gas from execution gracefully
    function executionWrapper(TaskReceipt memory taskReceipt, uint256 _gelatoMaxGas)
        public
        returns(ExecutionResult, string memory)
    {
        require(msg.sender == address(this), "GelatoCore.executionWrapper:onlyGelatoCore");

        // canExec()
        string memory canExecRes = canExec(taskReceipt, _gelatoMaxGas, tx.gasprice);
        if (!canExecRes.startsWithOk()) return (ExecutionResult.CanExecFailed, canExecRes);

        // Will revert if exec failed => will be caught in exec flow
        _exec(taskReceipt);

        // Execution Success: Executor REWARD
        return (ExecutionResult.ExecSuccess, "");
    }

    function _exec(TaskReceipt memory _TR) private {
        // We revert with an error msg in case of detected reverts
        string memory error;

        // INTERACTIONS
        // execPayload and proxyReturndataCheck values read from ProviderModule
        bytes memory execPayload;
        bool proxyReturndataCheck;

        try IGelatoProviderModule(_TR.task.provider.module).execPayload(_TR.task.actions)
            returns(bytes memory _execPayload, bool _proxyReturndataCheck)
        {
            execPayload = _execPayload;
            proxyReturndataCheck = _proxyReturndataCheck;
        } catch Error(string memory _error) {
            error = string(abi.encodePacked("GelatoCore._exec.execPayload:", _error));
        } catch {
            error = "GelatoCore._exec.execPayload:undefined";
        }

        // Execution via UserProxy
        bool success;
        bytes memory returndata;

        if (execPayload.length >= 4) (success, returndata) = _TR.userProxy.call(execPayload);
        else if (bytes(error).length == 0) error = "GelatoCore._exec.execPayload: invalid";

        // Check if actions reverts were caught by userProxy
        if (success && proxyReturndataCheck) {
            try _TR.task.provider.module.execRevertCheck(returndata) returns(bool _success) {
                success = _success;
            } catch Error(string memory _error) {
                error = string(abi.encodePacked("GelatoCore._exec.execRevertCheck:", _error));
            } catch {
                error = "GelatoCore._exec.execRevertCheck:undefined";
            }
        }

        // FAILURE: reverts, caught or uncaught in userProxy.call, were detected
        if (!success || bytes(error).length != 0) {
            // Error string decoding for returndata from userProxy.call
            if (bytes(error).length == 0) {
                // 32-length, 4-ErrorSelector, UTF-8 returndata
                if (returndata.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := mload(add(0x20, returndata)) }
                    if (selector == 0x08c379a0) {  // Function selector for Error(string)
                        assembly { returndata := add(returndata, 68) }
                        error = string(
                            abi.encodePacked("GelatoCore._exec:", string(returndata))
                        );
                    } else {
                        error = "GelatoCore._exec:NoErrorSelector";
                    }
                } else {
                    error = "GelatoCore._exec:UnexpectedReturndata";
                }
            }
            // We revert all state from userProxy.call
            revert(error);  //  we catch this revert in exec flow
        }

        // SUCCESS
        // Optional: Automated Cyclic Task Resubmission
        if (_TR.task.autoResubmitSelf) _submitNextTask(_TR, true);

        // Optional: Automated Cyclic Task Submission
        if (_TR.task.cycle.id != 0) _submitNextTask(_TR, false);
    }

    function _submitNextTask(TaskReceipt memory _TR, bool _resubmitSelf) private {
        // Increment TaskReceipt.id in storage ...
        currentTaskReceiptId++;
        // ... and sync with memory TaskReceipt to reflect new Receipt
        _TR.id++;

        // If we submit a new Task, we overwrite the current task field.
        // We won't reset the _TR.task field, if overwritten. Not needed in cont. exec flow.
        if (!_resubmitSelf) {
            uint256 nextTaskIndex;
            if (_TR.task.cycle.index == _TR.task.cycle.length - 1) nextTaskIndex = 0;
            else nextTaskIndex = _TR.task.cycle.index + 1;
            _TR.task = taskCycle[_TR.task.cycle.id][nextTaskIndex];
        }

        // Hash new TaskReceipt
        bytes32 hashedTaskReceipt = hashTaskReceipt(_TR);

        // Store new TaskReceipt Hash
        taskReceiptHash[_TR.id] = hashedTaskReceipt;

        emit LogTaskSubmitted(_TR.id, hashedTaskReceipt, _TR);

        // Reset currently being execute TaskReceipt.id for correct value in ExecEvents
        _TR.id--;
    }

    function _processProviderPayables(
        address _provider,
        ExecutorPay _payType,
        uint256 _startGas,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        private
        returns(uint256 executorCompensation, uint256 sysAdminCompensation)
    {
        // Provider payable Gas Refund capped at gelatoMaxGas
        uint256 estExecTxGas = _startGas <= _gelatoMaxGas ? _startGas : _gelatoMaxGas;

        // ExecutionCost (- consecutive state writes + gas refund from deletion)
        uint256 estGasConsumed = (EXEC_TX_OVERHEAD + estExecTxGas).sub(
            gasleft(),
            "GelatoCore._processProviderPayables: estGasConsumed underflow"
        );

        if (_payType == ExecutorPay.Reward) {
            executorCompensation = executorSuccessFee(estGasConsumed, _gelatoGasPrice);
            sysAdminCompensation = sysAdminSuccessFee(estGasConsumed, _gelatoGasPrice);
            // ExecSuccess: Provider pays ExecutorSuccessFee and SysAdminSuccessFee
            providerFunds[_provider] = providerFunds[_provider].sub(
                executorCompensation.add(sysAdminCompensation),
                "GelatoCore._processProviderPayables: providerFunds underflow"
            );
            executorStake[msg.sender] += executorCompensation;
            sysAdminFunds += sysAdminCompensation;
        } else {
            // ExecFailure: Provider REFUNDS estimated costs to executor
            executorCompensation = estGasConsumed.mul(_gelatoGasPrice);
            providerFunds[_provider] = providerFunds[_provider].sub(
                executorCompensation,
                "GelatoCore._processProviderPayables: providerFunds underflow"
            );
            executorStake[msg.sender] += executorCompensation;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelTask(TaskReceipt memory _TR) public override {
        // Checks
        require(
            msg.sender == _TR.userProxy || msg.sender == _TR.task.provider.addr,
            "GelatoCore.cancelTask: sender"
        );
        // Effects
        bytes32 hashedTaskReceipt = hashTaskReceipt(_TR);
        require(
            hashedTaskReceipt == taskReceiptHash[_TR.id],
            "GelatoCore.cancelTask: invalid taskReceiptHash"
        );
        delete taskReceiptHash[_TR.id];
        emit LogTaskCancelled(_TR.id);
    }

    function multiCancelTasks(TaskReceipt[] memory _taskReceipts) public override {
        for (uint i; i < _taskReceipts.length; i++) cancelTask(_taskReceipts[i]);
    }

    // Helper
    function hashTaskReceipt(TaskReceipt memory _TR) public pure override returns(bytes32) {
        return keccak256(abi.encode(_TR));
    }
}
