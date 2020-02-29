pragma solidity ^0.6.2;

import "./interfaces/IGelatoCore.sol";
import "./GelatoGasPriceOracle.sol";
import "./GelatoExecutor.sol";
import "./GelatoProvider.sol";
import "./GelatoUserProxyFactory.sol";
import "../external/Counters.sol";

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
    // executionClaimId => userProxy
    mapping(uint256 => address) public override userProxyByExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public override executionClaimHash;
    uint256 public constant override MAXGAS = 6000000;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address[2] calldata _providerAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload
    )
        external
        override
        liquidProvider(_providerAndExecutor[0], gelatoGasPrice, MAXGAS)
        registeredExecutor(_providerAndExecutor[1])
        providedCondition(_conditionAndAction[0])
        providedAction(_conditionAndAction[1])
    {
        address user;
        IGnosisSafe userProxy;
        if (isGelatoProxyUser(msg.sender)) {
            user = msg.sender;
            userProxy = gelatoProxyByUser[msg.sender];
        } else if (isGelatoUserProxy(msg.sender)) {
            user = userByGelatoProxy[msg.sender];
            userProxy = IGnosisSafe(msg.sender);
        } else {
            revert(
                "GelatoCore.mintExecutionClaim: caller must be registered user or proxy"
            );
        }

        // Mint new executionClaim
        executionClaimIds.increment();
        uint256 executionClaimId = executionClaimIds.current();
        userProxyByExecutionClaimId[executionClaimId] = userProxy;

        uint256 executionClaimExpiryDate = now.add(executorClaimLifespan[_selectedExecutor]);

        // ExecutionClaim Hashing
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _providerAndExecutor,
            executionClaimId,  // To avoid hash collisions
            userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            executionClaimExpiryDate
        );

        emit LogExecutionClaimMinted(
            _providerAndExecutor,
            executionClaimId,
            user,
            userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            executionClaimExpiryDate
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        address[2] memory _providerAndExecutor,
        uint256 _executionClaimId,
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
        if (!isProviderLiquid(_providerAndExecutor[0], gelatoGasPrice, MAXGAS))
            return "ProviderIlliquidity";

        if (executionClaimHash[_executionClaimId] == bytes32(0)) {
            if (_executionClaimId <= currentExecutionClaimId.current())
                return "AlreadyExecutedOrCancelled";
            else return "NonExistant";
        }

        if (_executionClaimExpiryDate < now) return "Expired";

        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _providerAndExecutor,
            _executionClaimId,
            _userProxy,
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
                return abi.encodePacked("ConditionNotOk: ", reason);
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
                _providerAndExecutor,
                _executionClaimId,
                _userProxy,
                _conditionAndAction,
                _conditionPayload,
                _actionPayload,
                _executionClaimExpiryDate
            );

            if (canExecuteResult == "ok") {
                emit LogCanExecuteSuccess(
                    _providerAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult
                );
            } else {
                emit LogCanExecuteFailed(
                    _providerAndExecutor,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction,
                    canExecuteResult
                );
                return;  // END OF EXECUTION
            }
        }

        // INTERACTIONS
        string memory executionFailureReason;

        try _userProxy.execTransactionFromModuleReturnData(
            _conditionAndAction[1],  // to
            0,  // value
            _actionPayload,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool actionExecuted, bytes memory actionRevertReason) {
            // Success
            if (actionExecuted) {
                emit LogSuccessfulExecution(
                    _providerAndExecutor[0],
                    msg.sender,
                    _executionClaimId,
                    _userProxy,
                    _conditionAndAction
                );

                // EFFECTS
                delete executionClaimHash[_executionClaimId];
                delete userProxyByExecutionClaimId[_executionClaimId];

                // ExecutionCost (- consecutive state writes + gas refund from deletion)
                uint256 estExecutionCost = (_startGas - gasleft()).mul(gelatoGasPrice);
                // Executors get 3% on their estimated Execution Cost
                uint256 executorReward = SafeMath.div(estExecutionCost.mul(103), 100);

                providerFunds[_providerAndExecutor[0]] = providerFunding[_provider].sub(
                    estExecutionCost,
                    "GelatoCore.execute: providerFunds underflow"
                );
                executorBalance[msg.sender] = executorBalance[msg.sender] + executionCost;

                return;  // END OF EXECUTION: SUCCESS!
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

        // Failure
        emit LogExecutionFailure(
            _provider,
            msg.sender,  // executor
            _executionClaimId,
            _userProxy,
            _condition,
            _action,
            executionFailureReason
        );
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecutionClaim(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] memory _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
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
            _actionPayload,
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
        bytes memory _actionPayload,
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
                _actionPayload,
                _executionClaimExpiryDate,
                _claimedProviderLiquidity
            )
        );
    }
}