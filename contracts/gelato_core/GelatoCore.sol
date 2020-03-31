pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCore, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { GelatoProviders } from "./GelatoProviders.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { GelatoString } from "../libraries/GelatoString.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";

/// @title GelatoCore
/// @notice Exec Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoSysAdmin, GelatoProviders, GelatoExecutors {

    using SafeMath for uint256;
    using GelatoString for string;

    // ================  STATE VARIABLES ======================================
    uint256 public override currentExecClaimId;
    // execClaim.id => already attempted non-gelatoMaxGas or not?
    mapping(uint256 => bool) public override isSecondExecAttempt;

    // ================  MINTING ==============================================
    // Only pass _executor for self-providing users, else address(0)
    function mintExecClaim(ExecClaim memory _execClaim, address _executor)
        public
        payable
        override
    {
        // Smart Contract Account or EOA
        _execClaim.userProxy = msg.sender;

        // EXECUTOR Handling
        // Users self-provides (prepayment) and assigns _executor
        if (msg.sender == _execClaim.provider) {
            if (_executor != address(0) && providerExecutor[msg.sender] != _executor)
                providerExecutor[msg.sender] = _executor;  // assign new executor
            else _executor = providerExecutor[msg.sender];  // default executor
            // User prepayment
            if (msg.value > 0) providerFunds[msg.sender] += msg.value;
        } else {
            // UserProxy mints: _executor always defaults to providerExecutor
            _executor = providerExecutor[_execClaim.provider];
            // PROVIDER CHECKS
            string memory isProvided = isProvided(_execClaim, gelatoGasPrice);
            require(
                isProvided.startsWithOk(),
                string(abi.encodePacked("GelatoCore.mintExecClaim.isProvided:", isProvided))
            );
        }

        // EXECUTOR CHECKS
        _requireMaxExecutorClaimLifespan(_executor, _execClaim.expiryDate);

        // Lock in Executor Success Fee
        require(
            _execClaim.executorSuccessShare == executorSuccessShare[_executor] &&
            _execClaim.executorSuccessShare <= providerExecutorShareCeil[_execClaim.provider],
            "GelatoCore.mintExecClaim: _execClaim.executorSuccessShare"
        );

        // Lock in Gelato Gas Price Oracle Success Fee
        require(
            _execClaim.sysAdminSuccessShare == sysAdminSuccessShare &&
            _execClaim.sysAdminSuccessShare <= providerGasAdminShareCeil[_execClaim.provider],
            "GelatoCore.mintExecClaim: _execClaim.sysAdminSuccessShare"
        );

        // Mint new execClaim
        currentExecClaimId++;
        _execClaim.id = currentExecClaimId;

        // ExecClaim Expiry Date defaults to executor's maximum allowance
        if (_execClaim.expiryDate == 0)
            _execClaim.expiryDate = now + executorClaimLifespan[_executor];

        // ExecClaim Hashing
        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));

        // ProviderClaim registration
        execClaimHashesByProvider[_execClaim.provider].add(execClaimHash);

        emit LogExecClaimMinted(_executor, _execClaim.id, execClaimHash, _execClaim);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(
        ExecClaim memory _execClaim,
        bytes32 _execClaimHash,
        uint256 _gelatoGasPrice,
        uint256 _gelatoMaxGas
    )
        public
        view
        override
        returns (string memory)
    {
        if (msg.sender != providerExecutor[_execClaim.provider]) return "InvalidExecutor";

        if (_execClaim.userProxy != _execClaim.provider) {
            string memory res = isProvided(_execClaim, _gelatoGasPrice);
            if (!res.startsWithOk()) return res;
        }

        if (!isProviderLiquid(_execClaim.provider, _gelatoGasPrice, _gelatoMaxGas))
            return "ProviderIlliquid";

        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));
        if (execClaimHash != _execClaimHash) return "ExecClaimHashInvalid";
        if (!isProviderClaim(_execClaim.provider, _execClaimHash))
            return "ExecClaimHashNotProvided";

        if (_execClaim.expiryDate < now) return "Expired";

        // CHECK for non-self-conditional Actions
        if (_execClaim.condition != address(0)) {
            try IGelatoCondition(_execClaim.condition).ok(_execClaim.conditionPayload)
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
        try IGelatoAction(_execClaim.action).termsOk(_execClaim.actionPayload)
            returns(string memory actionTermsOk)
        {
            if (actionTermsOk.startsWithOk()) return "Ok";
            return string(abi.encodePacked("ActionTermsNotOk:", actionTermsOk));
        } catch Error(string memory error) {
            return string(abi.encodePacked("ActionReverted:", error));
        } catch {
            return "ActionRevertedNoMessage";
        }
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutorPay {
        Reward,
        Refund
    }

    function exec(ExecClaim memory _execClaim, bytes32 _execClaimHash) public override {
        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        // memcopy of gelatoGasPrice and gelatoMaxGas, to avoid multiple storage reads
        uint256 _gelatoGasPrice = gelatoGasPrice;
        uint256 _gelatoMaxGas = gelatoMaxGas;

        // CHECKS
        require(tx.gasprice >= _gelatoGasPrice, "GelatoCore.exec: tx.gasprice");
        require(startGas < _gelatoMaxGas, "GelatoCore.exec: gas surplus");

        // 2nd Attempt: requires gelatoMaxGas
        if (isSecondExecAttempt[_execClaim.id]) {
            // 100k call overhead buffer
            require(startGas > _gelatoMaxGas - 100000, "GelatoCore.exec2: gas shortage");
            if (!_canExec(_execClaim, _execClaimHash, _gelatoGasPrice, _gelatoMaxGas))
                return;  // R-3: 2nd canExec failed: NO REFUND
            if(!_exec(_execClaim)) {
                // R-4: 2nd exec() failed. Executor REFUND and Claim deleted.
                delete isSecondExecAttempt[_execClaim.id];
                execClaimHashesByProvider[_execClaim.provider].remove(_execClaimHash);
                _processProviderPayables(ExecutorPay.Refund, startGas, _execClaim);
                return;
            }
            // R-4: 2nd exec() success
            delete isSecondExecAttempt[_execClaim.id];
        } else {
            // 1st Attempt: no requirement of using gelatoMaxGas
            if (!_canExec(_execClaim, _execClaimHash, _gelatoGasPrice, _gelatoMaxGas))
                return;  // R-0: 1st canExec() failed: NO REFUND
            if (!_exec(_execClaim)) {
                isSecondExecAttempt[_execClaim.id] = true;
                return;  // R-1: 1st exec() failed: NO REFUND but second attempt left
            }
        }

        // R-1 or -4: SUCCESS: ExecClaim deleted, Executor REWARD, Oracle paid
        execClaimHashesByProvider[_execClaim.provider].remove(_execClaimHash);
        _processProviderPayables(ExecutorPay.Reward, startGas, _execClaim);
    }

    function _canExec(
        ExecClaim memory _execClaim,
        bytes32 _execClaimHash,
        uint256 _gelatoGasPrice,
        uint256 _gelatoMaxGas
    )
        private
        returns(bool)
    {
        string memory res = canExec(_execClaim, _execClaimHash, _gelatoGasPrice, _gelatoMaxGas);
        if (res.startsWithOk()) {
            emit LogCanExecSuccess(msg.sender, _execClaim.id, res);
            return true;  // SUCCESS: continue Execution
        } else {
            emit LogCanExecFailed(msg.sender, _execClaim.id, res);
            return false;  // FAILURE: END Execution
        }
    }

    function _exec(ExecClaim memory _execClaim) private returns(bool success) {
        // INTERACTIONS
        bytes memory revertMsg;
        string memory error;

        // Provided Users vs. Self-Providing Users
        if (_execClaim.userProxy != _execClaim.provider) {
            // Provided Users: execPayload from ProviderModule
            bytes memory execPayload;
            try IGelatoProviderModule(_execClaim.providerModule).execPayload(
                _execClaim.action,
                _execClaim.actionPayload
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
                (success, revertMsg) = _execClaim.userProxy.call(execPayload);
            else error = "GelatoCore._exec.execPayload: invalid";
        } else {
            // Self-Providing Users: actionPayload == execPayload assumption
            // Execution via UserProxy
            if (_execClaim.actionPayload.length >= 4)
                (success, revertMsg) = _execClaim.userProxy.call(_execClaim.actionPayload);
            else error = "GelatoCore._exec.actionPayload: invalid";
        }

        // Error string decoding for revertMsg from userProxy.call
        if (!success && bytes(error).length == 0) {
            // FAILURE
            // 32-length, 4-ErrorSelector, UTF-8 revertMsg
            if (revertMsg.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(revertMsg, 32)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { revertMsg := mload(add(revertMsg, 36)) }
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

        // SUCCESS
        if (success) {
            emit LogExecSuccess(msg.sender, _execClaim.id);
            return success;  // END
        }

        // FAILURE
        emit LogExecFailed(msg.sender, _execClaim.id, error);
    }

    function _processProviderPayables(
        ExecutorPay _payType,
        uint256 _startGas,
        ExecClaim memory _execClaim
    )
        private
    {
        // ExecutionCost (- consecutive state writes + gas refund from deletion)
        uint256 estExecCost = (_startGas - gasleft()).mul(gelatoGasPrice);

        if (_payType == ExecutorPay.Reward) {
            uint256 executorSuccessFee = SafeMath.div(
                estExecCost.mul(_execClaim.executorSuccessShare),
                100,
                "GelatoCore._processProviderPayables: div error executorSuccessFee"
            );
            uint256 sysAdminSuccessFee = SafeMath.div(
                estExecCost.mul(_execClaim.sysAdminSuccessShare),
                100,
                "GelatoCore._processProviderPayables:  div error sysAdminSuccessShare"
            );
            // ExecSuccess: Provider pays ExecutorSuccessFee and OracleSuccessFee
            providerFunds[_execClaim.provider] = providerFunds[_execClaim.provider].sub(
                executorSuccessFee.add(sysAdminSuccessFee),
                "GelatoCore._processProviderPayables: providerFunds underflow"
            );
            executorFunds[msg.sender] += executorSuccessFee;
            gasAdminFunds += sysAdminSuccessFee;
        } else {
            // ExecFailure: Provider REFUNDS estimated costs to executor
            providerFunds[_execClaim.provider] = providerFunds[_execClaim.provider].sub(
                estExecCost,
                "GelatoCore._processProviderPayables:  providerFunds underflow"
            );
            executorFunds[msg.sender] += estExecCost;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecClaim(ExecClaim calldata _execClaim) external override {
        // Checks
        if (msg.sender != _execClaim.userProxy)
            require(_execClaim.expiryDate <= now, "GelatoCore.cancelExecClaim: sender");
        // Effects
        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));
        execClaimHashesByProvider[_execClaim.provider].remove(execClaimHash);
        if (isSecondExecAttempt[_execClaim.id]) delete isSecondExecAttempt[_execClaim.id];
        emit LogExecClaimCancelled(_execClaim.id);
    }
}