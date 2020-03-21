pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCore, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoGasAdmin } from "./GelatoGasAdmin.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { GelatoProviders } from "./gelato_providers/GelatoProviders.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";

/// @title GelatoCore
/// @notice Exec Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoGasAdmin, GelatoProviders, GelatoExecutors {
    // Library for unique ExecClaimIds
    using Address for address payable;  /// for oz's sendValue method
    using SafeMath for uint256;

    // ================  STATE VARIABLES ======================================
    uint256 public override currentExecClaimId;
    // execClaim.id => already attempted non-gelatoMaxGas or not?
    mapping(uint256 => bool) public override isSecondExecAttempt;

    // ================  MINTING ==============================================
    function mintExecClaim(address _executor, ExecClaim memory _execClaim)
        public
        payable
        override
    {
        // Smart Contract Account or EOA
        _execClaim.user = msg.sender;

        // Executor CHECKS
        _requireRegisteredExecutor(_executor);
        _requireMaxExecutorClaimLifespan(_executor, _execClaim.expiryDate);

        // Provider CHECKS - unless User self-provides
        if (msg.sender == _execClaim.provider) {
            providerFunds[msg.sender] += msg.value;
            providerExecutor[msg.sender] = _executor;
        } else {
            string memory isProvided = isProvided(_executor, _execClaim);
            require(_okStr(isProvided), "GelatoCore.mintExecClaim.isProvided");
        }

        // Mint new execClaim
        currentExecClaimId++;
        _execClaim.id = currentExecClaimId;

        // Lock in Executor Success Fee and Gelato Gas Price Oracle Success Fee
        _execClaim.executorSuccessFeeFactor = executorSuccessFeeFactor[_executor];
        _execClaim.oracleSuccessFeeFactor = oracleSuccessFeeFactor;

        // ExecClaim Expiry Date defaults to executor's maximum allowance
        if (_execClaim.expiryDate == 0)
            _execClaim.expiryDate = now + executorClaimLifespan[_executor];

        // ExecClaim Hashing
        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));

        // ProviderClaim registration
        execClaimHashesByProvider[_execClaim.provider].add(execClaimHash);

        emit LogExecClaimMinted(_executor, execClaimHash, _execClaim);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(ExecClaim memory _execClaim, bytes32 _execClaimHash)
        public
        view
        override
        returns (string memory)
    {
        if (_execClaim.user != _execClaim.provider) {
            string memory res = isProvided(msg.sender, _execClaim);
            if (!_okStr(res)) return res;
        }

        if (!isProviderLiquid(_execClaim.provider)) return "ProviderIlliquid";

        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));
        if (execClaimHash != _execClaimHash) return "_execClaimHashInvalid";
        if (!execClaimHashesByProvider[_execClaim.provider].contains(execClaimHash))
            return "ExecClaimHashNotProvided";

        if (_execClaim.expiryDate < now) return "Expired";

        // CHECK for non-self-conditional Actions
        if (_execClaim.condition != address(0)) {
            try IGelatoCondition(_execClaim.condition).ok(
                _execClaim.conditionPayload
            )
                returns(string memory res)
            {
                if (_okStr(res)) return "ok";
                return string(abi.encodePacked("ConditionNotOk:", res));
            } catch Error(string memory error) {
                return string(abi.encodePacked("ConditionReverted:", error));
            } catch {
                return "ConditionRevertedNoMessage";
            }
        }

        // CHECK Action Conditions
        try IGelatoAction(_execClaim.action).ok(_execClaim.actionPayload)
            returns(string memory res)
        {
            if (_okStr(res)) return "ok";
            return string(abi.encodePacked("ActionConditionsNotOk:", res));
        } catch Error(string memory error) {
            return string(abi.encodePacked("ActionReverted:", error));
        } catch {
            return "ActionRevertedNoMessage";
        }
    }

    function isProviderLiquid(address _provider)
        public
        view
        override
        returns(bool)
    {
        uint256 currentMaxFundsDemand = gelatoMaxGas.mul(gelatoGasPrice);
        return  currentMaxFundsDemand <= providerFunds[_provider] ? true : false;
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutorPay {
        Reward,
        Refund
    }

    function exec(ExecClaim memory _execClaim, bytes32 _execClaimHash) public override {
        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        // CHECKS
        require(tx.gasprice == gelatoGasPrice, "GelatoCore.exec: tx.gasprice");
        require(startGas < gelatoMaxGas, "GelatoCore.exec: gas surplus");

        // 2nd Attempt using gelatoMaxGas
        if (isSecondExecAttempt[_execClaim.id]) {
            // 100k call overhead buffer
            require(startGas > gelatoMaxGas - 100000, "GelatoCore.exec2: gas shortage");
            if (!_canExec(_execClaim, _execClaimHash)) return; // R-3: 2nd canExec failed: NO REFUND
            if(!_exec(_execClaim, _execClaimHash)) {
                // R-4: 2nd exec() failed. Executor REFUND and Claim deleted.
                delete isSecondExecAttempt[_execClaim.id];
                execClaimHashesByProvider[_execClaim.provider].remove(_execClaimHash);
                _processProviderPayables(ExecutorPay.Refund, startGas, _execClaim);
                return;
            }
            // R-4: 2nd exec() success
            delete isSecondExecAttempt[_execClaim.id];
        } else {
            // 1st Attempt NOT using gelatoMaxGas
            require(startGas < gelatoMaxGas - 100000, "GelatoCore.exec1: gas surplus");
            if (!_canExec(_execClaim, _execClaimHash)) return; // R-0: 1st canExec() failed: NO REFUND
            if (!_exec(_execClaim, _execClaimHash)) {
                isSecondExecAttempt[_execClaim.id] = true;
                return;  // R-1: 1st exec() failed: NO REFUND but second attempt
            }
        }

        // R-1 or -4: SUCCESS: ExecClaim deleted, Executor REWARD, Oracle paid
        execClaimHashesByProvider[_execClaim.provider].remove(_execClaimHash);
        _processProviderPayables(ExecutorPay.Reward, startGas, _execClaim);
    }

    function _canExec(ExecClaim memory _execClaim, bytes32 _execClaimHash)
        private
        returns(bool)
    {
        string memory res  = canExec(_execClaim, _execClaimHash);
        if (_okStr(res)) {
            emit LogCanExecSuccess(msg.sender, _execClaimHash, res);
            return true;  // SUCCESS: continue Execution
        } else {
            emit LogCanExecFailed(msg.sender, _execClaimHash, res);
            return false;  // FAILURE: END Execution
        }
    }

    function _exec(ExecClaim memory _execClaim, bytes32 _execClaimHash)
        private
        returns(bool success)
    {
        // INTERACTIONS
        bytes memory error;
        (success, error) =  _execClaim.user.call(_execClaim.execPayload);

        // SUCCESS
        if (success) {
            emit LogExecSuccess(msg.sender, _execClaimHash);
            return success;  // END
        }

        // FAILURE
        string memory reason;
        // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
        if (error.length % 32 == 4) {
            bytes4 selector;
            assembly { selector := mload(add(0x20, error)) }
            if (selector == 0x08c379a0) {  // selector for Error(string)
                assembly { error := add(error, 68) }
                reason = string(error);
            } else {
                reason = "NoErrorSelector";
            }
        } else {
            reason = "UnexpectedErrorFormat";
        }

        emit LogExecFailed(msg.sender, _execClaimHash, reason);
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
                estExecCost.mul(_execClaim.executorSuccessFeeFactor),
                100,
                "GelatoCore._processProviderPayables: div error executorSuccessFee"
            );
            uint256 oracleSuccessFee = SafeMath.div(
                estExecCost.mul(_execClaim.oracleSuccessFeeFactor),
                100,
                "GelatoCore._processProviderPayables:  div error oracleSuccessFee"
            );
            // ExecSuccess: Provider pays ExecutorSuccessFee and OracleSuccessFee
            providerFunds[_execClaim.provider] = providerFunds[_execClaim.provider].sub(
                executorSuccessFee.add(oracleSuccessFee),
                "GelatoCore._processProviderPayables: providerFunds underflow"
            );
            executorFunds[msg.sender] += executorSuccessFee;
            oracleFunds += oracleSuccessFee;
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
    function cancelExecClaim(ExecClaim memory _execClaim) public override {
        // Checks
        if (msg.sender != _execClaim.user)
            require(_execClaim.expiryDate <= now, "GelatoCore.cancelExecClaim: sender");
        // Effects
        bytes32 execClaimHash = keccak256(abi.encode(_execClaim));
        execClaimHashesByProvider[_execClaim.provider].remove(execClaimHash);
        if (isSecondExecAttempt[_execClaim.id]) delete isSecondExecAttempt[_execClaim.id];
        emit LogExecClaimCancelled(execClaimHash);
    }

    // ================ HELPERS ========================================
    function _okStr(string memory _str) private pure returns(bool) {
        if (bytes(_str).length >= 2 && bytes(_str)[0] == "o" && bytes(_str)[1] == "k")
            return true;
        return false;
    }
}