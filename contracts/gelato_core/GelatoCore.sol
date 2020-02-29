pragma solidity ^0.6.2;

import "./interfaces/IGelatoCore.sol";
import "./GelatoGasPriceOracle.sol";
import "./GelatoExecutor.sol";
import "./GelatoProvider.sol";
import "./GelatoUserProxyFactory.sol";
import "../external/Counters.sol";
import "./interfaces/IGnosisSafe.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is
    IGelatoCore, GelatoGasPriceOracle, GelatoProvider, GelatoExecutor, GelatoUserProxyFactory
{
    // Library for unique ExecutionClaimIds
    using Counters for Counters.Counter;
    using Address for address payable;  /// for oz's sendValue method

    // ================  STATE VARIABLES ======================================
    Counters.Counter public override currentExecutionClaimId;
    // executionClaimId => _userProxyProviderAndExecutor[0]
    mapping(uint256 => address) public override userProxyByExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public override executionClaimHash;
    uint256 public constant override MAXGAS = 6000000;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address[3] calldata _userProxyProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload
    )
        external
        override
    {
        _userProxyCheck(_userProxyProviderAndExecutor[0]);
        _liquidProvider(_userProxyProviderAndExecutor[1], gelatoGasPrice, MAXGAS);
        _providedCondition(_userProxyProviderAndExecutor[1], _conditionAndAction[0]);
        _providedAction(_userProxyProviderAndExecutor[1], _conditionAndAction[1]);
        _registeredExecutor(_userProxyProviderAndExecutor[2]);

        // Mint new executionClaim
        currentExecutionClaimId.increment();
        uint256 executionClaimId = currentExecutionClaimId.current();
        userProxyByExecutionClaimId[executionClaimId] = _userProxyProviderAndExecutor[0];

        uint256 executionClaimExpiryDate = now.add(
            executorClaimLifespan[_userProxyProviderAndExecutor[2]]
        );

        // ExecutionClaim Hashing
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _userProxyProviderAndExecutor,
            executionClaimId,  // To avoid hash collisions
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            executionClaimExpiryDate
        );

        emit LogExecutionClaimMinted(
            _userProxyProviderAndExecutor,
            executionClaimId,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            executionClaimExpiryDate
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        address[3] memory _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        public
        view
        override
        returns (string memory canExecuteResult)
    {
        if (!isProviderLiquid(_userProxyProviderAndExecutor[1], gelatoGasPrice, MAXGAS))
            return "ProviderIlliquidity";

        if (executionClaimHash[_executionClaimId] == bytes32(0)) {
            if (_executionClaimId <= currentExecutionClaimId.current())
                return "AlreadyExecutedOrCancelled";
            else return "NonExistant";
        }

        if (_executionClaimExpiryDate < now) return "Expired";

        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _userProxyProviderAndExecutor,
            _executionClaimId,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );

        if (computedExecutionClaimHash != executionClaimHash[_executionClaimId])
            return "WrongCalldataOrMsgSender";

        // Self-Conditional Actions pass and return
        if (_conditionAndAction[0] == address(0)) return "ok";
        else {
            // Dynamic Checks needed for Conditional Actions
            (bool success, bytes memory returndata) = _conditionAndAction[0].staticcall(
                _conditionPayload
            );
            if (!success) return "UnhandledConditionError";
            else {
                bool conditionReached;
                string memory reason;
                (conditionReached, reason) = abi.decode(returndata, (bool, string));
                if (conditionReached) return "ok";
                return string(abi.encodePacked("ConditionNotOk: ", reason));
            }
        }
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutorPayout {
        Reward,
        Refund
    }

    function execute(
        address[3] calldata _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        override
        txGasPriceCheck
    {
        uint256 startGas = gasleft();
        require(
            startGas < MAXGAS,
            "GelatoCore.execute: too much gas sent"
        );
        require(
            startGas > MAXGAS - 100000,  // 100k overhead buffer
            "GelatoCore.execute: insufficient gas sent"
        );

        // CHECK canExecute()
        {
            string memory canExecuteResult  = canExecute(
                _userProxyProviderAndExecutor,
                _executionClaimId,
                _conditionAndAction,
                _conditionPayload,
                _actionPayload,
                _executionClaimExpiryDate
            );

            if (
                keccak256(abi.encodePacked(canExecuteResult)) ==
                keccak256(abi.encodePacked("ok"))
            ) {
                emit LogCanExecuteSuccess(
                    _userProxyProviderAndExecutor,
                    _executionClaimId,
                    _conditionAndAction,
                    canExecuteResult
                );
            } else {
                emit LogCanExecuteFailed(
                    _userProxyProviderAndExecutor,
                    _executionClaimId,
                    _conditionAndAction,
                    canExecuteResult
                );
                return;  // END OF EXECUTION
            }
        }

        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        string memory executionFailureReason;

        try IGnosisSafe(_userProxyProviderAndExecutor[0]).execTransactionFromModuleReturnData(
            _conditionAndAction[1],  // to
            0,  // value
            _actionPayload,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool actionExecuted, bytes memory actionRevertReason) {
            // Success
            if (actionExecuted) {
                emit LogSuccessfulExecution(
                    _userProxyProviderAndExecutor,
                    msg.sender,
                    _executionClaimId,
                    _conditionAndAction
                );
                _executorPayout(
                    startGas,
                    ExecutorPayout.Reward,
                    _userProxyProviderAndExecutor[1]
                );
            } else {
                // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
                if (actionRevertReason.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := actionRevertReason }
                    if (selector == 0x08c379a0) {  // Function selector for Error(string)
                        assembly { actionRevertReason := add(actionRevertReason, 68) }
                        executionFailureReason = string(actionRevertReason);
                    } else {
                        executionFailureReason = "NoErrorSelector";
                    }
                } else {
                    executionFailureReason = "UnexpectedReturndata";
                }
            }
        } catch Error(string memory gnosisSafeProxyRevertReason) {
            executionFailureReason = gnosisSafeProxyRevertReason;
        } catch {
            executionFailureReason = "UndefinedGnosisSafeProxyError";
        }

        _executorPayout(startGas, ExecutorPayout.Refund, _userProxyProviderAndExecutor[1]);

        // Failure
        emit LogExecutionFailure(
            _userProxyProviderAndExecutor,
            msg.sender,  // executor
            _executionClaimId,
            _conditionAndAction,
            executionFailureReason
        );
    }

    function _executorPayout(
        uint256 _startGas,
        ExecutorPayout _payoutType,
        address _provider
    )
        private
    {
        // ExecutionCost (- consecutive state writes + gas refund from deletion)
        uint256 estExecutionCost = (_startGas - gasleft()).mul(gelatoGasPrice);

        if (_payoutType == ExecutorPayout.Reward) {
            // Provider refunds cost + 3% reward to executor
            providerFunds[_provider] = providerFunds[_provider].sub(
                estExecutionCost,
                "GelatoCore._executorPayout: providerFunds underflow"
            );
            executorBalance[msg.sender] = executorBalance[msg.sender] + SafeMath.div(
                estExecutionCost.mul(103),
                100
            );
        } else {
            // Provider refunds cost to executor
            providerFunds[_provider] = providerFunds[_provider].sub(
                estExecutionCost,
                "GelatoCore._executorPayout: providerFunds underflow"
            );
            executorBalance[msg.sender] = executorBalance[msg.sender] + estExecutionCost;
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecutionClaim(
        address[3] calldata _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        override
    {
        // Checks
        bool executionClaimExpired = _executionClaimExpiryDate <= now;
        if (
            msg.sender != userByGelatoProxy[_userProxyProviderAndExecutor[0]] &&
            msg.sender != _userProxyProviderAndExecutor[0]
        ) {
            require(
                executionClaimExpired,
                "GelatoCore.cancelExecutionClaim: msgSender problem"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _userProxyProviderAndExecutor,
            _executionClaimId,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );

        require(
            computedExecutionClaimHash == executionClaimHash[_executionClaimId],
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );

        // Effects
        delete userProxyByExecutionClaimId[_executionClaimId];
        delete executionClaimHash[_executionClaimId];

        emit LogExecutionClaimCancelled(
            _userProxyProviderAndExecutor,
            _executionClaimId,
            msg.sender,
            executionClaimExpired
        );
    }

    // ================ PRIVATE HELPERS ========================================
    function _computeExecutionClaimHash(
        address[3] memory _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        private
        pure
        returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _userProxyProviderAndExecutor,
                _executionClaimId,
                _conditionAndAction,
                _conditionPayload,
                _actionPayload,
                _executionClaimExpiryDate
            )
        );
    }
}