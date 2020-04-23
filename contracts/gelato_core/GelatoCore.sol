pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";

/// @title GelatoCore
/// @author Luis Schliesske & Hilmar Orth
/// @notice Exec Claim: createing, validation, execution, charging and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoExecutors {

    using SafeMath for uint256;

    // ================  STATE VARIABLES ======================================
    // ExecClaimIds
    uint256 public override currentExecClaimId;
    // execClaim.id => execClaimHash
    mapping(uint256 => bytes32) public override execClaimHash;

    // ================  CREATE ==============================================
    function createExecClaim(Task memory _task) public override { // submitTask
        // GelatoCore will generate an ExecClaim from the _task
        ExecClaim memory execClaim;
        execClaim.task = _task;

        // Smart Contract Accounts ONLY
        execClaim.userProxy = msg.sender;

        // EXECUTOR CHECKS
        address executor = executorByProvider[_task.provider.addr];
        require(
            isExecutorMinStaked(executor),
            "GelatoCore.createExecClaim: executorByProvider's stake is insufficient"
        );

        // User checks
        if (_task.expiryDate != 0) {
            require(
                _task.expiryDate >= now,
                "GelatoCore.createExecClaim: Invalid expiryDate"
            );
        }

        // Check Provider details
        string memory isProvided;
        if (msg.sender == _task.provider.addr) isProvided = providerModuleChecks(execClaim);
        else isProvided = isExecClaimProvided(execClaim);
        require(
            isProvided.startsWithOk(),
            string(abi.encodePacked("GelatoCore.createExecClaim.isProvided:", isProvided))
        );

        // Create new execClaim
        currentExecClaimId++;
        execClaim.id = currentExecClaimId;

        // ExecClaim Hashing
        bytes32 hashedExecClaim = hashExecClaim(execClaim);

        // ExecClaim Hash registration
        execClaimHash[execClaim.id] = hashedExecClaim;

        emit LogCreateExecClaim(executor, execClaim.id, hashedExecClaim, execClaim);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(ExecClaim memory _ec, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        public
        view
        override
        returns(string memory)
    {
        if (_execTxGasPrice != _getGelatoGasPrice()) return "ExecTxGasPriceNotGelatoGasPrice";

        if (!isProviderLiquid(_ec.task.provider.addr, _gelatoMaxGas, _execTxGasPrice))
            return "ProviderIlliquidity";

        if (_ec.userProxy != _ec.task.provider.addr) {
            string memory res = providerCanExec(_ec, _execTxGasPrice);
            if (!res.startsWithOk()) return res;
        }

        bytes32 hashedExecClaim = hashExecClaim(_ec);
        if (execClaimHash[_ec.id] != hashedExecClaim) return "InvalidExecClaimHash";

        if (_ec.task.expiryDate != 0 && _ec.task.expiryDate <= now) return "ExecClaimExpired";

        // CHECK Condition for user proxies
        if (_ec.task.condition.inst != IGelatoCondition(0)) {
            try _ec.task.condition.inst.ok(_ec.task.condition.data)
                returns(string memory condition)
            {
                if (!condition.startsWithOk())
                    return string(abi.encodePacked("ConditionNotOk:", condition));
            } catch Error(string memory error) {
                return string(abi.encodePacked("ConditionReverted:", error));
            } catch {
                return "ConditionRevertedNoMessage";
            }
        }

        // CHECK Action Conditions
        for (uint i; i < _ec.task.actions.length; i++) {
            // Only check termsOk if specified, else continue
            if (!_ec.task.actions[i].termsOkCheck) continue;

            try IGelatoAction(_ec.task.actions[i].inst).termsOk(_ec.task.actions[i].data)
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
        else if (msg.sender == executorByProvider[_ec.task.provider.addr]) return OK;
        else return "InvalidExecutor";
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutionResult { ExecSuccess, CanExecFailed, ExecFailed, ExecutionRevert }
    enum ExecutorPay { Reward, Refund }

    // Execution Entry Point: tx.gasprice must be _getGelatoGasPrice()
    function exec(ExecClaim memory _ec) public override {

        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        // CHECKS: all further checks are done during this.executionWrapper.canExec()
        require(startGas > internalGasRequirement, "GelatoCore.exec: Insufficient gas sent");
        require(
            msg.sender == executorByProvider[_ec.task.provider.addr],
            "GelatoCore.exec: Invalid Executor"
        );

        // memcopy of gelatoMaxGas, to avoid multiple storage reads
        uint256 _gelatoMaxGas = gelatoMaxGas;

        ExecutionResult executionResult;
        string memory reason;

        try this.executionWrapper{gas: gasleft() - internalGasRequirement}(_ec, _gelatoMaxGas)
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
            // END-1: SUCCESS => ExecClaim Deletion & Reward
            delete execClaimHash[_ec.id];
            (uint256 executorSuccessFee, uint256 sysAdminSuccessFee) = _processProviderPayables(
                _ec.task.provider.addr,
                ExecutorPay.Reward,
                startGas,
                _gelatoMaxGas,
                tx.gasprice  // == gelatoGasPrice
            );
            emit LogExecSuccess(msg.sender, _ec.id, executorSuccessFee, sysAdminSuccessFee);

        } else if (executionResult == ExecutionResult.CanExecFailed) {
            // END-2: CanExecFailed => No ExecClaim Deletion & No Refund
            emit LogCanExecFailed(msg.sender, _ec.id, reason);

        } else if (executionResult == ExecutionResult.ExecFailed) {
            // END-3.1: ExecFailed NO gelatoMaxGas => No ExecClaim Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecFailed(msg.sender, _ec.id, 0, reason);
            else {
                // END-3.2 ExecFailed BUT gelatoMaxGas was used
                //  => ExecClaim Deletion & Refund
                delete execClaimHash[_ec.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _ec.task.provider.addr,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                    tx.gasprice  // == gelatoGasPrice
                );
                emit LogExecFailed(msg.sender, _ec.id, executorRefund, reason);
            }

        } else {
            // executionResult == ExecutionResult.ExecutionRevert
            // END-4.1: ExecutionReverted NO gelatoMaxGas => No ExecClaim Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecutionRevert(msg.sender, _ec.id, 0);
            else {
                // END-4.2: ExecutionReverted BUT gelatoMaxGas was used
                //  => ExecClaim Deletion & Refund
                delete execClaimHash[_ec.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _ec.task.provider.addr,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                     tx.gasprice  // == gelatoGasPrice
                );
                emit LogExecutionRevert(msg.sender, _ec.id, executorRefund);
            }
        }
    }

    // Used by GelatoCore.exec(), to handle Out-Of-Gas from execution gracefully
    function executionWrapper(ExecClaim memory execClaim, uint256 _gelatoMaxGas)
        public
        returns(ExecutionResult, string memory)
    {
        require(msg.sender == address(this), "GelatoCore.executionWrapper:onlyGelatoCore");

        // canExec()
        string memory canExecRes = canExec(execClaim, _gelatoMaxGas, tx.gasprice);
        if (!canExecRes.startsWithOk()) return (ExecutionResult.CanExecFailed, canExecRes);

        // _exec()
        (bool success, string memory error) = _exec(execClaim);
        if (!success) return (ExecutionResult.ExecFailed, error);

        // Execution Success: Executor REWARD
        return (ExecutionResult.ExecSuccess, "");
    }

    function _exec(ExecClaim memory _ec)
        private
        returns(bool success, string memory error)
    {
        // INTERACTIONS
        // execPayload from ProviderModule
        bytes memory execPayload;
        try IGelatoProviderModule(_ec.task.provider.module).execPayload(_ec.task.actions)
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
        if (execPayload.length >= 4) (success, revertMsg) = _ec.userProxy.call(execPayload);
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
        uint256 estGasConsumed = EXEC_TX_OVERHEAD + estExecTxGas - gasleft();

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
                "GelatoCore._processProviderPayables:  providerFunds underflow"
            );
            executorStake[msg.sender] += executorCompensation;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecClaim(ExecClaim memory _ec) public override {
        // Checks
        require (msg.sender == _ec.userProxy || msg.sender == _ec.task.provider.addr, "GelatoCore.cancelExecClaim: sender");
        // Effects
        bytes32 hashedExecClaim = hashExecClaim(_ec);
        require(
            hashedExecClaim == execClaimHash[_ec.id],
            "GelatoCore.cancelExecClaim: invalid execClaimHash"
        );
        delete execClaimHash[_ec.id];
        emit LogExecClaimCancelled(_ec.id);
    }

    function batchCancelExecClaims(ExecClaim[] memory _execClaims) public override {
        for (uint i; i < _execClaims.length; i++) cancelExecClaim(_execClaims[i]);
    }

    // Helper
    function hashExecClaim(ExecClaim memory _ec) public pure override returns(bytes32) {
        return keccak256(abi.encode(_ec));
    }
}
