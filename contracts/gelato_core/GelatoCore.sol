pragma solidity ^0.6.4;

import "./interfaces/IGelatoCore.sol";
import "./GelatoGasPriceOracle.sol";
import "./GelatoExecutors.sol";
import "./gelato_providers/GelatoProviders.sol";
import "../external/Counters.sol";
import "../gelato_conditions/IGelatoCondition.sol";
import "../gelato_conditions/IGelatoAction.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoGasPriceOracle, GelatoProvider, GelatoExecutors {
    // Library for unique ExecutionClaimIds
    using Counters for Counters.Counter;
    using Address for address payable;  /// for oz's sendValue method

    // ================  STATE VARIABLES ======================================
    Counters.Counter public override currentExecutionClaimId;
    // Executor => ExecutionClaimHash
    mapping(address => bytes32) public override executorByExecutionClaimHash;
    // The maximum gas an executor can consume on behalf of a provider
    uint256 public constant override MAXGAS = 6000000;
    // An executor flags this
    mapping(uint256 => bool)



    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        override
    {
        // Provider CHECKS
        require(
            isProvided(
                _selectedProviderAndExecutor[0],
                msg.sender,  // userProxy
                _conditionAndAction[0],
                _conditionAndAction[1]
            ),
            "GelatoCore.mintExecutionClaim: isProvided"
        );

        // Executor CHECKS
        _requireRegisteredExecutor(_selectedProviderAndExecutor[1]);
        _maxExecutionClaimLifespan(_selectedProviderAndExecutor[1], _executionClaimExpiryDate);

        // Mint new executionClaim
        currentExecutionClaimId.increment();
        uint256 executionClaimId = currentExecutionClaimId.current();

        // ExecutionClaim Expiry Date defaults to executor's maximum allowance
        if (_executionClaimExpiryDate == 0) {
            _executionClaimExpiryDate = now.add(
                executorClaimLifespan[_selectedProviderAndExecutor[1]]
            );
        }

        // ExecutionClaim Hashing
        bytes32 executionClaimHash = _computeExecutionClaimHash(
            _selectedProvider[0],
            executionClaimId,  // To avoid hash collisions
            msg.sender,  // userProxy
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );

        // Executor Assignment
        executorByExecutionClaimHash[executionClaimHash] = executionClaimHash;

        emit LogExecutionClaimMinted(
            _selectedProviderAndExecutor,
            executionClaimId,
            msg.sender,  // userProxy
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        address _selectedProvider,
        uint256 _executionClaimId,
        bytes32 _executionClaimHash,
        address _userProxy,
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
        if (!isProviderLiquid(_selectedProvider, gelatoGasPrice, MAXGAS))
            return "ProviderIlliquid";

        if (executorByExecutionClaimHash[_executionClaimHash] != msg.sender)
            return "NotAssignedByProvider";

        if (_executionClaimExpiryDate < now) return "Expired";

        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _selectedProvider,
            _executionClaimId, // To avoid hash collisions
            _userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );

        if (computedExecutionClaimHash != _executionClaimHash) return "WrongDataOrSender";

        // Self-Conditional Actions pass and return
        if (_conditionAndAction[0] == address(0))
        else {
            // Dynamic Checks needed for Conditional Actions
            try IGelatoCondition(_conditionAndAction[0]).ok(_conditionPayload)
                returns(string memory s)
            {
                if (bytes(s).length >= 2 && bytes(s)[0] == "o" && bytes(s)[1] == "k")
                    return "ok";
                return string(abi.encodePacked("ConditionNotOk:", s)));
            } catch Error(string memory message) {
                return string(abi.encodePacked("ConditionReverted:", message)));
            } catch {
                return "ConditionRevertedNoMessage";
            }
        }

        // IGelatoAction.actionConditionsCheck
        try IGelatoAction(_conditionAndAction[1]).ok(_actionPayload)
            returns(string memory s)
        {
            if (bytes(s).length >= 2 && bytes(s)[0] == "o" && bytes(s)[1] == "k")
                return "ok";
            return string(abi.encodePacked("ActionConditionsNotOk:", s)));
        } catch Error(string memory message) {
            return string(abi.encodePacked("ActionReverted:", message)));
        } catch {
            return "ActionRevertedNoMessage";
        }
    }

    // ================  EXECUTE EXECUTOR API ============================
    enum ExecutorPayout {
        Reward,
        Refund
    }

    function execute(
        address[2] calldata _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        bytes32 _executionClaimHash,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        override
    {
        // Store startGas for gas-consumption based cost and payout calcs
        uint256 startGas = gasleft();

        // CHECKS
        require(
            tx.gasprice == gelatoGasPrice,
            "GelatoCore.execute: tx.gasprice must be gelatoGasPrice"
        );
        require(
            startGas < MAXGAS,
            "GelatoCore.execute: too much gas sent"
        );
        require(
            startGas > MAXGAS - 100000,  // 100k overhead buffer
            "GelatoCore.execute: insufficient gas sent"
        );
        // canExecute()
        {
            string memory canExecuteResult  = canExecute(
                [_selectedProviderAndExecutor[0], msg.sender],
                _executionClaimId,
                _userProxy,
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
                    _selectedProviderAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult
                );
            } else {
                emit LogCanExecuteFailed(
                    _selectedProviderAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult
                );
                return;  // FAILURE: END OF EXECUTION
            }
        }

        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        string memory executionFailureReason;

        try IGnosisSafe(_userProxy).execTransactionFromModuleReturnData(
            _conditionAndAction[1],  // to
            0,  // value
            _actionPayload,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool actionExecuted, bytes memory actionRevertReason) {
            // Success
            if (actionExecuted) {
                emit LogSuccessfulExecution(
                    _selectedProviderAndExecutor,
                    msg.sender,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction
                );
                // Executor is REWARDED for SUCCESSFUL execution
                _executorPayout(
                    startGas,
                    ExecutorPayout.Reward,
                    _selectedProviderAndExecutor[0]
                );
                return;  // SUCCESS: END OF EXECUTION
            } else {
                // FAILURE
                // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
                if (actionRevertReason.length % 32 == 4) {
                    bytes4 selector;
                    assembly { selector := mload(add(0x20, actionRevertReason)) }
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
        // FAILURE: Executor is REFUNDED for failed attempt
        _executorPayout(startGas, ExecutorPayout.Refund, _selectedProviderAndExecutor[0]);

        emit LogExecutionFailure(
            _selectedProviderAndExecutor,
            msg.sender,  // executor
            _executionClaimId,
            _userProxy,
            _conditionAndAction,
            executionFailureReason
        );
    }

    function _execute(
        address[2] memory _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _actionPayload,
        uint256 _executionClaimExpiryDate
    )

    function _executeWithMAXGAS(
        address[2] memory _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _actionPayload,
        uint256 _executionClaimExpiryDate
    )

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
                100,
                "GelatoCore._executorPayout: division error"
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
        address[2] calldata _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
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
            msg.sender != userByGelatoProxy[_userProxy] && msg.sender != _userProxy
        ) {
            require(
                executionClaimExpired,
                "GelatoCore.cancelExecutionClaim: msgSender problem"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _selectedProviderAndExecutor,
            _executionClaimId,
            _userProxy,
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
            _selectedProviderAndExecutor,
            _executionClaimId,
            msg.sender,
            _userProxy,
            executionClaimExpired
        );
    }

    // ================  PROVIDER EXECUTOR REASSIGNMENT API ====================
    function reassignExecutionClaim(
        address _newExecutor,
        address _selectedExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
    {
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            [msg.sender, _selectedExecutor],
            _executionClaimId,
            _userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );
        require(
            computedExecutionClaimHash != executionClaimHash[_executionClaimId],
            "GelatoCore.reassignExecutionClaim: computedExecutionClaimHash"
        );

    }



    // ================ PRIVATE HELPERS ========================================
    function _computeExecutionClaimHash(
        address[2] memory _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
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
                _selectedProviderAndExecutor,
                _executionClaimId,
                _userProxy,
                _conditionAndAction,
                _conditionPayload,
                _actionPayload,
                _executionClaimExpiryDate
            )
        );
    }
}