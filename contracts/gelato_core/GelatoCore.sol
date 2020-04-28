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

    // ================  SUBMIT ==============================================
    function canSubmitTask(address _executor, address _userProxy, Task memory _task)
        public
        view
        override
        returns(string memory)
    {
        // EXECUTOR CHECKS
        if (!isExecutorMinStaked(_executor)) return "GelatoCore.canSubmitTask: executorStake";

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

    function submitTask(Task memory _task) public override { // submitTask
        // Executor
        address executor = executorByProvider[_task.provider.addr];

        // canSubmit Gate
        string memory canSubmitRes = canSubmitTask(executor, msg.sender, _task);
        require(canSubmitRes.startsWithOk(), canSubmitRes);

        // Increment TaskReceipt ID storage
        uint256 nextTaskId = currentTaskReceiptId + 1;
        currentTaskReceiptId = nextTaskId;

        // Generate new Task Receipt
        TaskReceipt memory taskReceipt = TaskReceipt({
            id: nextTaskId,
            userProxy: msg.sender, // Smart Contract Accounts ONLY
            task: _task
        });

        // Hash TaskReceipt
        bytes32 hashedTaskReceipt = hashTaskReceipt(taskReceipt);

        // Store TaskReceipt Hash
        taskReceiptHash[taskReceipt.id] = hashedTaskReceipt;

        emit LogTaskSubmitted(executor, taskReceipt.id, hashedTaskReceipt, taskReceipt);
    }

    function multiSubmitTasks(Task[] memory _tasks) public override {
        for (uint i; i < _tasks.length; i++) submitTask(_tasks[i]);
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

        // Executor Validation
        if (msg.sender == address(this)) return OK;
        else if (msg.sender == executorByProvider[_TR.task.provider.addr]) return OK;
        else return "InvalidExecutor";
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutionResult { ExecSuccess, CanExecFailed, ExecFailed, ExecutionRevert }
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

        } catch {
            // If any of the external calls in executionWrapper resulted in e.g. out of gas,
            // Executor is eligible for a Refund, but only if Executor sent gelatoMaxGas.
            executionResult = ExecutionResult.ExecutionRevert;
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

        } else if (executionResult == ExecutionResult.ExecFailed) {
            // END-3.1: ExecFailed NO gelatoMaxGas => No TaskReceipt Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecFailed(msg.sender, _TR.id, 0, reason);
            else {
                // END-3.2 ExecFailed BUT gelatoMaxGas was used
                //  => TaskReceipt Deletion & Refund
                delete taskReceiptHash[_TR.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _TR.task.provider.addr,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                    tx.gasprice  // == gelatoGasPrice
                );
                emit LogExecFailed(msg.sender, _TR.id, executorRefund, reason);
            }

        } else {
            // executionResult == ExecutionResult.ExecutionRevert
            // END-4.1: ExecutionReverted NO gelatoMaxGas => No TaskReceipt Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecutionReverted(msg.sender, _TR.id, 0);
            else {
                // END-4.2: ExecutionReverted BUT gelatoMaxGas was used
                //  => TaskReceipt Deletion & Refund
                delete taskReceiptHash[_TR.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _TR.task.provider.addr,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                     tx.gasprice  // == gelatoGasPrice
                );
                emit LogExecutionReverted(msg.sender, _TR.id, executorRefund);
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

        // _exec()
        (bool success, string memory error) = _exec(taskReceipt);
        if (!success) return (ExecutionResult.ExecFailed, error);

        // Execution Success: Executor REWARD
        return (ExecutionResult.ExecSuccess, "");
    }

    function _exec(TaskReceipt memory _TR)
        private
        returns(bool success, string memory error)
    {
        // INTERACTIONS
        // execPayload from ProviderModule
        bytes memory execPayload;
        try IGelatoProviderModule(_TR.task.provider.module).execPayload(_TR.task.actions)
            returns(bytes memory _execPayload)
        {
            execPayload = _execPayload;
        } catch Error(string memory _error) {
            error = string(abi.encodePacked("GelatoCore._exec.execPayload:", _error));
        } catch {
            error = "GelatoCore._exec.execPayload";
        }

        // Execution via UserProxy
        bytes memory revertMsg;
        if (execPayload.length >= 4) (success, revertMsg) = _TR.userProxy.call(execPayload);
        else if (bytes(error).length == 0) error = "GelatoCore._exec.execPayload: invalid";

        // FAILURE
        if (!success) {
            // Error string decoding for revertMsg from userProxy.call
            if (bytes(error).length == 0) {
                // 32-length, 4-ErrorSelector, UTF-8 revertMsg
                if (revertMsg.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := mload(add(0x20, revertMsg)) }
                    if (selector == 0x08c379a0) {  // Function selector for Error(string)
                        assembly { revertMsg := add(revertMsg, 68) }
                        error = string(
                            abi.encodePacked("GelatoCore._exec:", string(revertMsg))
                        );
                    } else {
                        error = "GelatoCore._exec:NoErrorSelector";
                    }
                } else {
                    error = "GelatoCore._exec:UnexpectedReturndata";
                }
            }
        }
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
