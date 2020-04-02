pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCore, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoExecutors } from "./GelatoExecutors.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { GelatoString } from "../libraries/GelatoString.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";
import { IGelatoAction } from "../gelato_actions/IGelatoAction.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";

/// @title GelatoCore
/// @notice Exec Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoExecutors {

    using SafeMath for uint256;
    using GelatoString for string;

    // ================  STATE VARIABLES ======================================
    uint256 public override currentExecClaimId;
    // execClaim.id => execClaimHash
    mapping(uint256 => bytes32) public override execClaimHash;
    // Executors can charge Providers execClaimRent
    mapping(uint256 => uint256) public override lastExecClaimRentPaymentDate;

    // ================  MINTING ==============================================
    // Only pass _executor for self-providing users, else address(0)
    function mintExecClaim(ExecClaim memory _execClaim) public override {
        // Smart Contract Accounts ONLY
        _execClaim.userProxy = msg.sender;

        // EXECUTOR CHECKS
        address executor = providerExecutor[_execClaim.provider];
        require(
            isExecutorMinStaked(executor),
            "GelatoCore.mintExecClaim: providerExecutor's stake is insufficient."
        );

        // PROVIDER CHECKS (not for self-Providers)
        if (msg.sender != _execClaim.provider) {
            string memory isProvided = combinedProviderChecks(_execClaim, gelatoGasPrice);
            require(
                isProvided.startsWithOk(),
                string(
                    abi.encodePacked(
                        "GelatoCore.mintExecClaim.combinedProviderChecks:",
                        isProvided
                    )
                )
            );
        }

        // Mint new execClaim
        currentExecClaimId++;
        _execClaim.id = currentExecClaimId;

        // ExecClaim Hashing
        bytes32 hashedExecClaim = keccak256(abi.encode(_execClaim));

        // ExecClaim Hash registration
        execClaimHash[_execClaim.id] = hashedExecClaim;

        // First ExecClaim Rent for first execClaimTenancy is free
        lastExecClaimRentPaymentDate[_execClaim.id] = now;

        emit LogExecClaimMinted(executor, _execClaim.id, hashedExecClaim, _execClaim);
    }

    function mintSelfProvidedExecClaim(ExecClaim memory _execClaim, address _executor)
        public
        payable
        override
    {
        // CHECK: UserProxy (msg.sender) is self-Provider
        require(
            msg.sender == _execClaim.provider,
            "GelatoCore.mintSelfProvidedExecClaim: sender not provider"
        );

        // Executor Handling
        if (_executor != address(0) && providerExecutor[msg.sender] != _executor)
            providerExecutor[msg.sender] = _executor;  // assign new executor

        // Optional User prepayment
        if (msg.value > 0) providerFunds[msg.sender] += msg.value;

        // Minting
        mintExecClaim(_execClaim);
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
        returns(string memory)
    {
        if (msg.sender != providerExecutor[_execClaim.provider]) return "InvalidExecutor";

        if (_execClaim.userProxy != _execClaim.provider) {
            string memory res = combinedProviderChecks(_execClaim, _gelatoGasPrice);
            if (!res.startsWithOk()) return res;
        }

        if (!isProviderLiquid(_execClaim.provider, _gelatoGasPrice, _gelatoMaxGas))
            return "ProviderIlliquid";

        bytes32 hashedExecClaim = keccak256(abi.encode(_execClaim));
        if (hashedExecClaim != _execClaimHash) return "Invalid_execClaimHash";
        if (execClaimHash[_execClaim.id] != hashedExecClaim) return "InvalidExecClaimHash";

        if (_execClaim.expiryDate != 0 && _execClaim.expiryDate < now) return "Expired";

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
        require(tx.gasprice == _gelatoGasPrice, "GelatoCore.exec: tx.gasprice");

        // internal canExec() check
        if (!_canExec(_execClaim, _execClaimHash, _gelatoGasPrice, _gelatoMaxGas))
            return;  // canExec failed: NO REFUND

        // internal exec attempt and check
        if(!_exec(_execClaim)) {
            // If the executor used gelatoMaxGas - txOverhead: Refund + Delete ExecClaim
            if (startGas > _gelatoMaxGas - 100000) {
                _processProviderPayables(
                    _execClaim.provider,
                    ExecutorPay.Refund,
                    startGas,
                    _gelatoMaxGas,
                    _gelatoGasPrice
                );
                delete execClaimHash[_execClaim.id];
            }
            return;  // EXEC-FAILURE: - retry possible if gelatoMaxGas was not used
        }

        // EXEC-SUCCESS: Provider Pays Executor Reward
        delete execClaimHash[_execClaim.id];
        _processProviderPayables(
            _execClaim.provider,
            ExecutorPay.Reward,
            startGas,
            _gelatoMaxGas,
            _gelatoGasPrice
        );
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

        // FAILURE
        if (!success) {
            // Error string decoding for revertMsg from userProxy.call
            if (bytes(error).length == 0) {
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
            emit LogExecFailed(msg.sender, _execClaim.id, error);  // FAILURE END
        } else emit LogExecSuccess(msg.sender, _execClaim.id);  // SUCCESS END
    }

    function _processProviderPayables(
        address _provider,
        ExecutorPay _payType,
        uint256 _startGas,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        private
    {
        // Provider payable Gas Refund capped at gelatoMaxGas
        uint256 estExecTxGas = _startGas <= _gelatoMaxGas ? _startGas : _gelatoMaxGas;

        // ExecutionCost (- consecutive state writes + gas refund from deletion)
        uint256 estGasConsumed = estExecTxGas - gasleft();

        if (_payType == ExecutorPay.Reward) {
            uint256 executorSuccessFee = executorSuccessFee(estGasConsumed, _gelatoGasPrice);
            uint256 sysAdminSuccessFee = sysAdminSuccessFee(estGasConsumed, _gelatoGasPrice);
            // ExecSuccess: Provider pays ExecutorSuccessFee and SysAdminSuccessFee
            providerFunds[_provider] = providerFunds[_provider].sub(
                executorSuccessFee.add(sysAdminSuccessFee),
                "GelatoCore._processProviderPayables: providerFunds underflow"
            );
            executorFunds[msg.sender] += executorSuccessFee;
            sysAdminFunds += sysAdminSuccessFee;
        } else {
            // ExecFailure: Provider REFUNDS estimated costs to executor
            uint256 estExecCost = estGasConsumed.mul(_gelatoGasPrice);
            providerFunds[_provider] = providerFunds[_provider].sub(
                estExecCost,
                "GelatoCore._processProviderPayables:  providerFunds underflow"
            );
            executorFunds[msg.sender] += estExecCost;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecClaim(ExecClaim memory _execClaim) public override {
        // Checks
        if (msg.sender != _execClaim.userProxy && msg.sender != _execClaim.provider)
            require(_execClaim.expiryDate <= now, "GelatoCore.cancelExecClaim: sender");
        // Effects
        bytes32 hashedExecClaim = keccak256(abi.encode(_execClaim));
        require(
            hashedExecClaim == execClaimHash[_execClaim.id],
            "GelatoCore.cancelExecClaim: invalid execClaimHash"
        );
        delete execClaimHash[_execClaim.id];
        emit LogExecClaimCancelled(_execClaim.id);
    }

    function batchCancelExecClaim(ExecClaim[] memory _execClaims) public override {
        for (uint i; i < _execClaims.length; i++) cancelExecClaim(_execClaims[i]);
    }

    // ================  EXECCLAIM RENT APIs =================
    function collectExecClaimRent(ExecClaim memory _execClaim) public override {
        // CHECKS
        require(
            providerExecutor[_execClaim.provider] == msg.sender,
            "GelatoCore.collecExecClaimRent: msg.sender not assigned Executor"
        );
        require(
            lastExecClaimRentPaymentDate[_execClaim.id] <= now - execClaimTenancy,
            "GelatoCore.collecExecClaimRent: rent is not due"
        );
        require(
            coreProviderChecks(_execClaim),
            "GelatoCore.collecExecClaimRent: coreProviderChecks failed"
        );
        require(
            providerFunds[_execClaim.provider] >= execClaimRent,
            "GelatoCore.collecExecClaimRent: insufficient providerFunds"
        );
        bytes32 hashedExecClaim = keccak256(abi.encode(_execClaim));
        require(
            hashedExecClaim == execClaimHash[_execClaim.id],
            "GelatoCore.collectExecClaimRent: invalid execClaimHash"
        );

        // EFFECTS: If the ExecClaim expired, automatic cancellation
        if (_execClaim.expiryDate != 0 && _execClaim.expiryDate <= now) {
            cancelExecClaim(_execClaim);
            delete lastExecClaimRentPaymentDate[_execClaim.id];
        }
        else lastExecClaimRentPaymentDate[_execClaim.id] = now;

        // INTERACTIONS: Provider pays Executor ExecClaim Rent
        providerFunds[_execClaim.provider] -= execClaimRent;
        executorFunds[msg.sender] += execClaimRent;

        emit LogCollectExecClaimRent(
            msg.sender,
            _execClaim.provider,
            _execClaim.id,
            execClaimRent
        );
    }

    function batchCollectExecClaimRent(ExecClaim[] memory _execClaims) public override {
        for (uint i; i < _execClaims.length; i++) collectExecClaimRent(_execClaims[i]);
    }

}