pragma solidity ^0.6.2;

import "./interfaces/IGelatoCore.sol";
import "./GnosisSafeProxyUserManager.sol";
import "./GelatoCoreAccounting.sol";
import "../external/Counters.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GnosisSafeProxyUserManager, GelatoCoreAccounting {

    // Library for unique ExecutionClaimIds
    using Counters for Counters.Counter;
    using Address for address payable;  /// for oz's sendValue method

    // ================  STATE VARIABLES ======================================
    Counters.Counter private executionClaimIds;
    // executionClaimId => userGnosisSafeProxy
    mapping(uint256 => IGnosisSafe) public override gnosisSafeProxyByExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public override executionClaimHash;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address _sponsor,
        address _executor,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        override
        sponsorCheck(_sponsor, address(_action))
        onlyRegisteredExecutors(_executor)
    {
        // We should get user here too but np due to stack too deep
        IGnosisSafe userGnosisSafeProxy;
        if (isRegisteredUser(msg.sender))
            userGnosisSafeProxy = gnosisSafeProxyByUser[msg.sender];
        else if (isRegisteredGnosisSafeProxy(IGnosisSafe(msg.sender)))
            userGnosisSafeProxy = IGnosisSafe(msg.sender);
        else
            revert(
                "GelatoCore.mintExecutionClaim: caller must be registered user or proxy"
            );

        // Mint new executionClaim
        executionClaimIds.increment();
        uint256 executionClaimId = executionClaimIds.current();
        gnosisSafeProxyByExecutionClaimId[executionClaimId] = userGnosisSafeProxy;

        uint256 executionClaimExpiryDate = now.add(executorClaimLifespan[_executor]);

        // ExecutionClaim Hashing
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _sponsor,
            _executor,
            executionClaimId,  // To avoid hash collisions
            userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            executionClaimExpiryDate
        );

        emit LogExecutionClaimMinted(
            _sponsor,
            _executor,
            executionClaimId,
            userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            executionClaimExpiryDate
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        address _sponsor,
        uint256 _executionClaimId,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes memory _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        public
        view
        override
        returns (CanExecuteResult, uint8 reason)
    {
        if (sponsorBalance[_sponsor] < gasleft().mul(adminGasPrice)) {
            return (
                CanExecuteResult.InsufficientSponsorBalance,
                uint8(StandardReason.NotOk)
            );
        }

        if (executionClaimHash[_executionClaimId] == bytes32(0)) {
            if (_executionClaimId <= executionClaimIds.current()) {
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
            _sponsor,
            msg.sender,  // executor
            _executionClaimId,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _executionClaimExpiryDate
        );

        if (computedExecutionClaimHash != executionClaimHash[_executionClaimId]) {
            return (
                CanExecuteResult.WrongCalldataOrMsgSender,
                uint8(StandardReason.NotOk)
            );
        }

        // Self-Conditional Actions pass and return
        if (address(_condition) == address(0)) {
            return (
                CanExecuteResult.Executable,
                uint8(StandardReason.Ok)
            );
        } else {
            // Dynamic Checks needed for Conditional Actions
            (bool success, bytes memory returndata) = address(_condition).staticcall(
                _conditionPayloadWithSelector
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
        address _sponsor,
        uint256 _executionClaimId,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        external
        override
    {
        uint256 startGas = gasleft();

        // CHECK canExecute()
        {
            (CanExecuteResult canExecuteResult, uint8 canExecuteReason) = canExecute(
                _sponsor,
                _executionClaimId,
                _userGnosisSafeProxy,
                _condition,
                _conditionPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _executionClaimExpiryDate
            );

            if (canExecuteResult == CanExecuteResult.Executable) {
                emit LogCanExecuteSuccess(
                    _sponsor,
                    msg.sender,
                    _executionClaimId,
                    _userGnosisSafeProxy,
                    _condition,
                    canExecuteResult,
                    canExecuteReason
                );
            } else {
                emit LogCanExecuteFailed(
                    _sponsor,
                    msg.sender,
                    _executionClaimId,
                    _userGnosisSafeProxy,
                    _condition,
                    canExecuteResult,
                    canExecuteReason
                );
                return;  // END OF EXECUTION
            }
        }

        // INTERACTIONS
        string memory executionFailureReason;

        try _userGnosisSafeProxy.execTransactionFromModuleReturnData(
            address(_action),  // to
            0,  // value
            _actionPayloadWithSelector,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool actionExecuted, bytes memory actionRevertReason) {
            // Success
            if (actionExecuted) {
                emit LogSuccessfulExecution(
                    _sponsor,
                    msg.sender,
                    _executionClaimId,
                    _userGnosisSafeProxy,
                    _condition,
                    _action
                );

                // EFFECTS
                delete executionClaimHash[_executionClaimId];
                delete gnosisSafeProxyByExecutionClaimId[_executionClaimId];

                // Executor Refund + Reward. Refund is not in full due to 2 state writes.
                uint256 executorReward = (_startGas - gasleft()).mul(adminGasPrice).add(
                    5 finney
                );
                sponsorBalance[_sponsor] = sponsorBalance[_sponsor] - executorReward;
                executorBalance[msg.sender] = executorBalance[msg.sender] + executorReward;

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
            _sponsor,
            msg.sender,  // executor
            _executionClaimId,
            _userGnosisSafeProxy,
            _condition,
            _action,
            executionFailureReason
        );
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecutionClaim(
        address _sponsor,
        address _executor,
        uint256 _executionClaimId,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        external
        override
    {
        bool executionClaimExpired = _executionClaimExpiryDate <= now;
        if (
            msg.sender != userByGnosisSafeProxy[address(_userGnosisSafeProxy)] &&
            IGnosisSafe(msg.sender) != _userGnosisSafeProxy
        ) {
            require(
                executionClaimExpired && msg.sender == _executor,
                "GelatoCore.cancelExecutionClaim: msgSender problem"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _sponsor,
            _executor,
            _executionClaimId,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _executionClaimExpiryDate
        );
        // Checks
        require(
            computedExecutionClaimHash == executionClaimHash[_executionClaimId],
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );
        // Effects
        delete gnosisSafeProxyByExecutionClaimId[_executionClaimId];
        delete executionClaimHash[_executionClaimId];
        emit LogExecutionClaimCancelled(
            _executionClaimId,
            _userGnosisSafeProxy,
            msg.sender,
            executionClaimExpired
        );
    }

    // ================  STATE READERS ======================================
    function getCurrentExecutionClaimId()
        external
        view
        override
        returns(uint256 currentId)
    {
        currentId = executionClaimIds.current();
    }

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        override
        returns(address)
    {
        IGnosisSafe gnosisSafeProxy = gnosisSafeProxyByExecutionClaimId[_executionClaimId];
        return userByGnosisSafeProxy[address(gnosisSafeProxy)];
    }

    // ================ PRIVATE HELPERS ========================================
    function _computeExecutionClaimHash(
        address _sponsor,
        address _executor,
        uint256 _executionClaimId,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes memory _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        private
        pure
        returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _sponsor,
                _executor,
                _executionClaimId,
                _userGnosisSafeProxy,
                _condition,
                _conditionPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _executionClaimExpiryDate
            )
        );
    }
}