pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCore, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoGasAdmin } from "./GelatoGasAdmin.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { GelatoProviders } from "./gelato_providers/GelatoProviders.sol";
import { Address } from "../external/Address.sol";
import { EnumerableSet } from "../external/EnumerableSet.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";


/// @title GelatoCore
/// @notice Exec Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoGasAdmin, GelatoProviders, GelatoExecutors {
    // Library for unique ExecClaimIds
    using Address for address payable;  /// for oz's sendValue method
    using EnumerableSet for EnumerableSet.WordSet;
    using SafeMath for uint256;

    // ================  STATE VARIABLES ======================================
    uint256 public override currentExecClaimId;
    // ExecClaimHashes => Executor
    mapping(address => EnumerableSet.WordSet) private execClaimHashesByExecutor;
    // execClaim.id => already attempted non-gelatoMaxGas or not?
    mapping(uint256 => bool) public override isSecondExecAttempt;

    // ================  MINTING ==============================================
    function mintExecClaim(address _executor, ExecClaim memory _execClaim)
        public
        override
    {
        // UserProxies are the expected callers
        _execClaim.userProxy = msg.sender;

        // Provider CHECKS
        require(isProvided(_executor, _execClaim), "GelatoCore.mintExecClaim: isProvided");

        // Executor CHECKS
        _requireRegisteredExecutor(_executor);
        _requireMaxExecutorClaimLifespan(_executor, _execClaim.expiryDate);

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

        // Executor Mandate assignment
        execClaimHashesByExecutor[_executor].add(execClaimHash);

        emit LogExecClaimMinted(_executor, _execClaim, execClaimHash);
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExec(ExecClaim memory _execClaim, bytes32 _execClaimHash)
        public
        view
        override
        returns (string memory)  // canExecResult
    {
        if (!isProviderLiquid(_execClaim.provider)) return "ProviderIlliquid";
        if (!isProvided(msg.sender, _execClaim)) return "NotProvided";
        if (_execClaim.expiryDate < now) return "Expired";
        if (!execClaimHashCmp(_execClaim, _execClaimHash)) return "InvalidData";
        if (!execClaimHashesByExecutor[msg.sender].contains(_execClaimHash))
            return "NoProviderMandate";

        // Self-Conditional Actions pass and return
        if (_execClaim.condition != address(0)) {
            // Dynamic Checks needed for Conditional Actions
            try IGelatoCondition(_execClaim.condition).ok(
                _execClaim.conditionPayload
            )
                returns(string memory res)
            {
                if (bytes(res).length >= 2 && bytes(res)[0] == "o" && bytes(res)[1] == "k")
                    return "ok";
                return string(abi.encodePacked("ConditionNotOk:", res));
            } catch Error(string memory error) {
                return string(abi.encodePacked("ConditionReverted:", error));
            } catch {
                return "ConditionRevertedNoMessage";
            }
        }

        // IGelatoAction.ok
        try IGelatoAction(_execClaim.action).ok(_execClaim.actionPayload)
            returns(string memory res)
        {
            if (bytes(res).length >= 2 && bytes(res)[0] == "o" && bytes(res)[1] == "k")
                return "ok";
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
            if(!_exec(_execClaim)) {
                // R-4: 2nd exec() failed. Executor REFUND and Claim deleted.
                delete isSecondExecAttempt[_execClaim.id];
                execClaimHashesByExecutor[msg.sender].remove(_execClaimHash);
                _processProviderPayables(ExecutorPay.Refund, startGas, _execClaim);
                return;
            }
            // R-4: 2nd exec() success
            delete isSecondExecAttempt[_execClaim.id];
        } else {
            // 1st Attempt NOT using gelatoMaxGas
            require(startGas < gelatoMaxGas - 100000, "GelatoCore.exec1: gas surplus");
            if (!_canExec(_execClaim, _execClaimHash)) return; // R-0: 1st canExec() failed: NO REFUND
            if (!_exec(_execClaim)) {
                isSecondExecAttempt[_execClaim.id] = true;
                return;  // R-1: 1st exec() failed: NO REFUND but second attempt
            }
        }

        // R-1 or -4: SUCCESS: ExecClaim deleted, Executor REWARD, Oracle paid
        execClaimHashesByExecutor[msg.sender].remove(_execClaimHash);
        _processProviderPayables(ExecutorPay.Reward, startGas, _execClaim);
    }

    function _canExec(ExecClaim memory _execClaim, bytes32 _execClaimHash)
        private
        returns(bool)
    {
        string memory res  = canExec(_execClaim, _execClaimHash);
        if (bytes(res).length >= 2 && bytes(res)[0] == "o" && bytes(res)[1] == "k") {
            emit LogCanExecSuccess(msg.sender, _execClaim.id, res);
            return true;  // SUCCESS: continue Execution
        } else {
            emit LogCanExecFailed(msg.sender, _execClaim.id, res);
            return false;  // FAILURE: END Execution
        }
    }

    function _exec(ExecClaim memory _execClaim) private returns(bool success) {
        // INTERACTIONS
        bytes memory error;
        (success, error) =  _execClaim.userProxy.call(_execClaim.execPayload);

        // SUCCESS
        if (success) {
            emit LogExecSuccess(msg.sender, _execClaim.id);
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

        emit LogExecFailed(msg.sender, _execClaim.id, reason);
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
            executorFunds[msg.sender] = executorFunds[msg.sender] + executorSuccessFee;
            oracleFunds = oracleFunds + oracleSuccessFee;
        } else {
            // ExecFailure: Provider REFUNDS estimated costs to executor
            providerFunds[_execClaim.provider] = providerFunds[_execClaim.provider].sub(
                estExecCost,
                "GelatoCore._processProviderPayables:  providerFunds underflow"
            );
            executorFunds[msg.sender] = executorFunds[msg.sender] + estExecCost;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecClaim(
        address _executor,
        ExecClaim memory _execClaim,
        bytes32 _execClaimHash
    )
        public
        override
    {
        // Checks
        bool expired = _execClaim.expiryDate <= now;
        if (msg.sender != _execClaim.userProxy)
            require(expired, "GelatoCore.cancelExecClaim: sender");
        require(
            execClaimHashCmp(_execClaim, _execClaimHash),
            "GelatoCore.cancelExecClaim: _execClaimhash"
        );

        // Effects
        if (isSecondExecAttempt[_execClaim.id]) delete isSecondExecAttempt[_execClaim.id];
        execClaimHashesByExecutor[_executor].remove(_execClaimHash);

        emit LogExecClaimCancelled(_execClaim.id, _executor, msg.sender, expired);
    }

    // ================  PROVIDER EXECUTOR REASSIGNMENT API ====================
    function reassignExecClaim(
        address _oldExecutor,
        address _newExecutor,
        ExecClaim memory _execClaim,
        bytes32 _execClaimHash
    )
        public
    {
        require(msg.sender == _execClaim.provider, "GelatoCore.reassignExecClaim: sender");
        require(
            execClaimHashCmp(_execClaim, _execClaimHash),
            "GelatoCore.reassignExecClaim: _execClaimhash"
        );
        execClaimHashesByExecutor[_oldExecutor].remove(_execClaimHash);
        execClaimHashesByExecutor[_newExecutor].add(_execClaimHash);
    }

    // ================  Executors' Claims GETTER APIs =========================
    function isExecutorClaim(address _executor, bytes32 _execClaimHash)
        external
        view
        override
        returns(bool)
    {
        return execClaimHashesByExecutor[_executor].contains(_execClaimHash);
    }

    function numOfExecutorClaims(address _executor) external view override returns(uint256) {
        return execClaimHashesByExecutor[_executor].length();
    }

    function executorClaims(address _executor) external view override returns(bytes32[] memory) {
        return execClaimHashesByExecutor[_executor].enumerate();
    }

    // ================ HELPERS ========================================
    function execClaimHashCmp(ExecClaim memory _execClaim, bytes32 _hash)
        public
        pure
        override
        returns(bool)
    {
        return keccak256(abi.encode(_execClaim)) == _hash ? true : false;
    }
}