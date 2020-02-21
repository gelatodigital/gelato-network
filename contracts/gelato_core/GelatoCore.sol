pragma solidity ^0.6.2;

import "./interfaces/IGelatoCore.sol";
import "./GelatoGasPriceOracle.sol";
import "./GelatoExecutor.sol";
import "./GelatoProvider.sol";
import "../external/Counters.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoGasPriceOracle, GelatoProvider, GelatoExecutor {

    // Library for unique ExecutionClaimIds
    using Counters for Counters.Counter;
    using Address for address payable;  /// for oz's sendValue method

    // ================  STATE VARIABLES ======================================
    Counters.Counter public override currentExecutionClaimId;
    // executionClaimId => userProxy
    mapping(uint256 => address) public override userProxyByExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public override executionClaimHash;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address[2] calldata _providerAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _executionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        override
        isPCA(_providerAndExecutor[0], _conditionAndAction[0], _conditionAndAction[1])
        registeredExecutor(_providerAndExecutor[1])
        maxExecutionClaimLifespan(_providerAndExecutor[1], _executionClaimExpiryDate)
    {
        // Claim liquidity from provider
        uint256 claimedProviderLiquidity = provisionPerExecutionClaim(
            _providerAndExecutor[0],
            0  // 0 for providerGasPriceCeiling
        );

        // Ensure Provider Liquidity
        require(
            providerFunds[_providerAndExecutor[0]].sub(
                lockedProviderFunds[_providerAndExecutor[0]],
                "GelatoCore.mintExecutionClaim: providerLiquidity underflow"
            ) > claimedProviderLiquidity,
            "GelatoCore.mintExecutionClaim: provider illiquid"
        );

        // Lock Providers Funds attributed to this ExecutionClaim
        lockedProviderFunds[_providerAndExecutor[0]] = (
            lockedProviderFunds[_providerAndExecutor[0]] + claimedProviderLiquidity
        );

        // Mint new executionClaim
        currentExecutionClaimId.increment();
        uint256 executionClaimId = currentExecutionClaimId.current();
        userProxyByExecutionClaimId[executionClaimId] = msg.sender;

        // ExecutionClaim Hashing
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _providerAndExecutor,
            executionClaimId,  // To avoid hash collisions
            msg.sender,  // userProxy
            _conditionAndAction,
            _conditionPayload,
            _executionPayload,
            _executionClaimExpiryDate,
            claimedProviderLiquidity
        );

        emit LogExecutionClaimMinted(
            _providerAndExecutor,
            executionClaimId,
            msg.sender,  // userProxy
            _conditionAndAction,
            _conditionPayload,
            _executionPayload,
            _executionClaimExpiryDate,
            claimedProviderLiquidity
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        address[2] memory _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _executionPayload,
        uint256 _executionClaimExpiryDate,
        uint256 _claimedProviderLiquidity
    )
        public
        view
        override
        returns (CanExecuteResult, uint8 reason)
    {
        if (availableProviderLiquidity(_providerAndExecutor[0]) < _claimedProviderLiquidity) {
            return (
                CanExecuteResult.ProviderIlliquidity,
                uint8(StandardReason.NotOk)
            );
        }

        if (executionClaimHash[_executionClaimId] == bytes32(0)) {
            if (_executionClaimId <= currentExecutionClaimId.current()) {
                return (
                    CanExecuteResult.ExecutionClaimAlreadyExecutedOrCancelled,
                    uint8(StandardReason.NotOk)
                );
            } else {
                return (
                    CanExecuteResult.ExecutionClaimNonExistant,
                    uint8(StandardReason.NotOk)
                );
            }
        }

        if (_executionClaimExpiryDate < now) {
            return (
                CanExecuteResult.ExecutionClaimExpired,
                uint8(StandardReason.NotOk)
            );
        }

        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _providerAndExecutor,
            _executionClaimId,
            _userProxy,
            _conditionAndAction,
            _conditionPayload,
            _executionPayload,
            _executionClaimExpiryDate,
            _claimedProviderLiquidity
        );

        if (computedExecutionClaimHash != executionClaimHash[_executionClaimId]) {
            return (
                CanExecuteResult.WrongCalldataOrMsgSender,
                uint8(StandardReason.NotOk)
            );
        }

        // Self-Conditional Actions pass and return
        if (_conditionAndAction[0] == address(0)) {
            return (
                CanExecuteResult.Executable,
                uint8(StandardReason.Ok)
            );
        } else {
            // Dynamic Checks needed for Conditional Actions
            (bool success, bytes memory returndata) = _conditionAndAction[0].staticcall(
                _conditionPayload
            );
            if (!success) {
                return (
                    CanExecuteResult.UnhandledConditionError,
                    uint8(StandardReason.UnhandledError)
                );
            } else {
                bool conditionReached;
                (conditionReached, reason) = abi.decode(returndata, (bool, uint8));
                if (!conditionReached)
                    return (CanExecuteResult.ConditionNotOk, reason);
                else return (CanExecuteResult.Executable, reason);
            }
        }
    }

    // ================  EXECUTE EXECUTOR API ============================
    function execute(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _executionPayload,
        uint256 _executionClaimExpiryDate,
        uint256 _claimedProviderLiquidity
    )
        external
        override
    {
        uint256 startGas = gasleft();

        // CHECK canExecute()
        {
            (CanExecuteResult canExecuteResult, uint8 canExecuteReason) = canExecute(
                _providerAndExecutor,
                _executionClaimId,
                _userProxy,
                _conditionAndAction,
                _conditionPayload,
                _executionPayload,
                _executionClaimExpiryDate,
                _claimedProviderLiquidity
            );

            if (canExecuteResult == CanExecuteResult.Executable) {
                emit LogCanExecuteSuccess(
                    _providerAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult,
                    canExecuteReason
                );
            } else {
                emit LogCanExecuteFailed(
                    _providerAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult,
                    canExecuteReason
                );
                return;  // END OF EXECUTION
            }
        }

        // INTERACTIONS
        (bool executed, bytes memory returndata) = _userProxy.call(_executionPayload);

        // Success
        if (executed) {
            emit LogSuccessfulExecution(
                _providerAndExecutor,
                _executionClaimId,
                _userProxy,
                _conditionAndAction,
                _action
            );

            // EFFECTS
            delete executionClaimHash[_executionClaimId];
            delete userProxyByExecutionClaimId[_executionClaimId];

            // Use gelatoGasPrice if provider default or if below provider ceiling
            uint256 billedGasPrice = providerGasPriceCeiling[_providerAndExecutor[0]];
            if (billedGasPrice == 0 || gelatoGasPrice < billedGasPrice)
                billedGasPrice = gelatoGasPrice;

            // Executor Refund + Reward. Refund is not in full due to 3 state writes.
            uint256 executorReward = (startGas - gasleft()).mul(billedGasPrice).add(
                5 finney
            );

            providerFunds[_providerAndExecutor[0]] = providerFunds[_providerAndExecutor[0]].sub(
                executorReward,
                "GelatoCore.execute: providerFunds underflow"
            );

            lockedProviderFunds[_providerAndExecutor[0]] = lockedProviderFunds[_providerAndExecutor[0]].sub(
                executorReward,
                "GelatoCore.execute: lockedProviderFunds underflow"
            );

            executorBalance[msg.sender] = executorBalance[msg.sender].add(executorReward);
        } else {
            // Failure
            string memory executionFailureReason;

            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
            if (returndata.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := returndata }

                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { returndata := add(returndata, 68) }
                    executionFailureReason = string(returndata);
                } else {
                    executionFailureReason = "NoErrorSelector";
                }
            } else {
                executionFailureReason = "UnexpectedReturndata";
            }

            emit LogExecutionFailure(
                _providerAndExecutor,
                _executionClaimId,
                _userProxy,
                _conditionAndAction[0],
                _action,
                executionFailureReason
            );
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecutionClaim(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _executionPayload,
        uint256 _executionClaimExpiryDate,
        uint256 _claimedProviderLiquidity
    )
        external
        override
    {
        // Checks
        if (msg.sender != _userProxy) {
            require(
                _executionClaimExpiryDate <= now,
                "GelatoCore.cancelExecutionClaim: not expired"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _providerAndExecutor,
            _executionClaimId,
            _userProxy,
            _conditionAndAction[0],
            _conditionPayload,
            _action,
            _executionPayload,
            _executionClaimExpiryDate,
            _claimedProviderLiquidity
        );

        require(
            computedExecutionClaimHash == executionClaimHash[_executionClaimId],
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );

        // Effects
        delete userProxyByExecutionClaimId[_executionClaimId];
        delete executionClaimHash[_executionClaimId];


        // Interactions
        lockedProviderFunds[_providerAndExecutor[0]] = lockedProviderFunds[_providerAndExecutor[0]].sub(
            _claimedProviderLiquidity,
            "GelatoCore.cancelExecutionClaim: lockedProviderFunds underflow"
        );

        emit LogExecutionClaimCancelled(
            _providerAndExecutor,
            _executionClaimId,
            _userProxy,
            msg.sender,
            _executionClaimExpiryDate <= now,
            _claimedProviderLiquidity
        );
    }

    // ================ PRIVATE HELPERS ========================================
    function _computeExecutionClaimHash(
        address[2] memory _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes memory _conditionPayload,
        bytes memory _executionPayload,
        uint256 _executionClaimExpiryDate,
        uint256 _claimedProviderLiquidity
    )
        private
        pure
        returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _providerAndExecutor[0],
                _providerAndExecutor[1],
                _executionClaimId,
                _userProxy,
                _conditionAndAction[0],
                _conditionPayload,
                _action,
                _executionPayload,
                _executionClaimExpiryDate,
                _claimedProviderLiquidity
            )
        );
    }
}