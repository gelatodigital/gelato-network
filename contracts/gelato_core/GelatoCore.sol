pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";

/// @title GelatoCore
/// @notice Exec Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoExecutors {

    using SafeMath for uint256;

    // ================  STATE VARIABLES ======================================
    // Executor compensation for estimated tx costs not accounted for by startGas
    uint256 public constant override EXEC_TX_OVERHEAD = 50000;
    // ExecClaimIds
    uint256 public override currentExecClaimId;
    // execClaim.id => execClaimHash
    mapping(uint256 => bytes32) public override execClaimHash;
    // Executors can charge Providers execClaimRent
    mapping(uint256 => uint256) public override lastExecClaimRentPaymentDate;


    // ================  MINTING ==============================================
    // Only pass _executor for self-providing users, else address(0)
    function mintExecClaim(Task memory _task) public override {
        // GelatoCore will generate an ExecClaim from the _task
        ExecClaim memory execClaim;
        execClaim.task = _task;

        // Smart Contract Accounts ONLY
        execClaim.userProxy = msg.sender;

        // EXECUTOR CHECKS
        address executor = executorByProvider[_task.provider];
        require(
            isExecutorMinStaked(executor),
            "GelatoCore.mintExecClaim: executorByProvider's stake is insufficient."
        );

        // User checks
        if (_task.expiryDate != 0) {
            require(
                _task.expiryDate >= now,
                "GelatoCore.mintExecClaim: Invalid expiryDate"
            );
        }

        // PROVIDER CHECKS (not for self-Providers)
        if (msg.sender != _task.provider) {
            string memory isProvided = isExecClaimProvided(execClaim);
            require(
                isProvided.startsWithOk(),
                string(abi.encodePacked("GelatoCore.mintExecClaim.isProvided:", isProvided))
            );
        }

        // Mint new execClaim
        currentExecClaimId++;
        execClaim.id = currentExecClaimId;

        // ExecClaim Hashing
        bytes32 hashedExecClaim = keccak256(abi.encode(execClaim));

        // ExecClaim Hash registration
        execClaimHash[execClaim.id] = hashedExecClaim;

        // First ExecClaim Rent for first execClaimTenancy is free
        lastExecClaimRentPaymentDate[execClaim.id] = now;

        emit LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);
    }

    function mintSelfProvidedExecClaim(Task memory _task, address _executor)
        public
        payable
        override
    {
        // CHECK: UserProxy (msg.sender) is self-Provider
        require(
            msg.sender == _task.provider,
            "GelatoCore.mintSelfProvidedExecClaim: sender not provider"
        );

        // Optional User prepayment
        if (msg.value > 0) provideFunds(msg.sender);

        // Executor Handling
        if (_executor != address(0) && executorByProvider[msg.sender] != _executor)
            providerAssignsExecutor(_executor);  // assign new executor

        // Minting
        mintExecClaim(_task);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(ExecClaim memory _ec, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(string memory)
    {
        if (_ec.userProxy != _ec.task.provider) {
            string memory res = providerCanExec(_ec, _gelatoGasPrice);
            if (!res.startsWithOk()) return res;
        }

        if (!isProviderMinStaked(_ec.task.provider)) return "ProviderNotMinStaked";

        bytes32 hashedExecClaim = keccak256(abi.encode(_ec));
        if (execClaimHash[_ec.id] != hashedExecClaim) return "InvalidExecClaimHash";

        if (_ec.task.expiryDate != 0 && _ec.task.expiryDate < now) return "Expired";

        // CHECK Condition for user proxies
        if (_ec.task.condition != address(0)) {
            try IGelatoCondition(_ec.task.condition).ok(_ec.task.conditionPayload)
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

            try IGelatoAction(_ec.task.actions[i]).termsOk(_ec.task.actionsPayload[i])
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

        if (
            msg.sender != executorByProvider[_ec.task.provider] &&
            msg.sender != address(this)
        )
            return "InvalidExecutor";

        return "Ok";
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutionResult { ExecSuccess, CanExecFailed, ExecFailed, ExecutionRevert }
    enum ExecutorPay { Reward, Refund }

    // Execution Entry Point
    function exec(ExecClaim memory _ec) public override {
        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        require(startGas > internalGasRequirement, "GelatoCore.exec: Insufficient gas sent");

        // memcopy of gelatoGasPrice and gelatoMaxGas, to avoid multiple storage reads
        uint256 _gelatoGasPrice = gelatoGasPrice();
        uint256 _gelatoMaxGas = gelatoMaxGas;

        // CHECKS
        require(tx.gasprice == _gelatoGasPrice, "GelatoCore.exec: tx.gasprice");

        ExecutionResult executionResult;
        string memory reason;

        try this.executionWrapper{gas: startGas - internalGasRequirement}(_ec, _gelatoGasPrice)
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
                _ec.task.provider,
                ExecutorPay.Reward,
                startGas,
                _gelatoMaxGas,
                _gelatoGasPrice
            );
            emit LogExecSuccess(msg.sender, _ec.id, executorSuccessFee, sysAdminSuccessFee);
            return;

        } else if (executionResult == ExecutionResult.CanExecFailed) {
            // END-2: CanExecFailed => No ExecClaim Deletion & No Refund
            emit LogCanExecFailed(msg.sender, _ec.id, reason);
            return;

        } else if (executionResult == ExecutionResult.ExecFailed) {
            // END-3.1: ExecFailed NO gelatoMaxGas => No ExecClaim Deletion & No Refund
            if (startGas < _gelatoMaxGas) emit LogExecFailed(msg.sender, _ec.id, 0, reason);
            else {
                // END-3.2 ExecFailed BUT gelatoMaxGas was used
                //  => ExecClaim Deletion & Refund
                delete execClaimHash[_ec.id];
                (uint256 executorRefund,) = _processProviderPayables(
                    _ec.task.provider,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                    _gelatoGasPrice
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
                    _ec.task.provider,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                    _gelatoGasPrice
                );
                emit LogExecutionRevert(msg.sender, _ec.id, executorRefund);
            }
        }
    }

    // Used by GelatoCore.exec(), to handle Out-Of-Gas from execution gracefully
    function executionWrapper(ExecClaim memory execClaim, uint256 _gelatoGasPrice)
        public
        returns(ExecutionResult, string memory)
    {
        require(msg.sender == address(this), "GelatoCore.executionWrapper:onlyGelatoCore");

        // canExec()
        string memory canExecRes = canExec(execClaim, _gelatoGasPrice);
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
        bytes memory revertMsg;

        // Provided Users vs. Self-Providing Users
        if (_ec.userProxy != _ec.task.provider) {
            // Provided Users: execPayload from ProviderModule
            bytes memory execPayload;
            try IGelatoProviderModule(_ec.task.providerModule).execPayload(
                _ec.task.actions,
                _ec.task.actionsPayload
            )
                returns(bytes memory _execPayload)
            {
                execPayload = _execPayload;
            } catch Error(string memory _error) {
                error = string(abi.encodePacked("GelatoCore._exec.execPayload:", _error));
            } catch {
                error = "GelatoCore._exec.execPayload";
            }

            // Execution via UserProxy
            if (execPayload.length >= 4)
                (success, revertMsg) = _ec.userProxy.call(execPayload);

            else error = "GelatoCore._exec.execPayload: invalid";
        } else {
            // Self-Providing Users: actionPayload == execPayload assumption
            // Execution via UserProxy
            if (_ec.task.actionsPayload[0].length >= 4 ) {
                if ( _ec.task.actionsPayload.length == 1) (success, revertMsg) = _ec.userProxy.call(_ec.task.actionsPayload[0]);
                else error = "GelatoCore._exec.actionsPayload: Needs to be one";
            }

            else error = "GelatoCore._exec.actionPayload: invalid";
        }

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
        if (msg.sender != _ec.userProxy && msg.sender != _ec.task.provider)
            require(_ec.task.expiryDate <= now, "GelatoCore.cancelExecClaim: sender");
        // Effects
        bytes32 hashedExecClaim = keccak256(abi.encode(_ec));
        require(
            hashedExecClaim == execClaimHash[_ec.id],
            "GelatoCore.cancelExecClaim: invalid execClaimHash"
        );
        delete execClaimHash[_ec.id];
        emit LogExecClaimCancelled(_ec.id);
    }

    function batchCancelExecClaim(ExecClaim[] memory _execClaims) public override {
        for (uint i; i < _execClaims.length; i++) cancelExecClaim(_execClaims[i]);
    }

    // ================  EXECCLAIM RENT APIs =================
    function collectExecClaimRent(ExecClaim memory _ec) public override {
        // CHECKS
        require(
            executorByProvider[_ec.task.provider] == msg.sender,
            "GelatoCore.collecExecClaimRent: msg.sender not assigned Executor"
        );
        if (_ec.task.expiryDate != 0) {
            require(
                _ec.task.expiryDate > now,
                "GelatoCore.collectExecClaimRent: expired"
            );
        }
        require(
            lastExecClaimRentPaymentDate[_ec.id] <= now - execClaimTenancy,
            "GelatoCore.collecExecClaimRent: rent is not due"
        );
        require(
            (isConditionActionProvided(_ec)).startsWithOk(),
            "GelatoCore.collecExecClaimRent: isConditionActionProvided failed"
        );
        require(
            providerFunds[_ec.task.provider] >= execClaimRent,
            "GelatoCore.collecExecClaimRent: insufficient providerFunds"
        );
        bytes32 hashedExecClaim = keccak256(abi.encode(_ec));
        require(
            hashedExecClaim == execClaimHash[_ec.id],
            "GelatoCore.collectExecClaimRent: invalid execClaimHash"
        );

        // EFFECTS
        lastExecClaimRentPaymentDate[_ec.id] = now;

        // INTERACTIONS: Provider pays Executor ExecClaim Rent.
        providerFunds[_ec.task.provider] -= execClaimRent;
        executorStake[msg.sender] += execClaimRent;

        emit LogCollectExecClaimRent(
            msg.sender,
            _ec.task.provider,
            _ec.id,
            execClaimRent
        );
    }

    function batchCollectExecClaimRent(ExecClaim[] memory _execClaims) public override {
        for (uint i; i < _execClaims.length; i++) collectExecClaimRent(_execClaims[i]);
    }
}
