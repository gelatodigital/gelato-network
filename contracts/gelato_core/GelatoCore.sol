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
        address _selectedBenefactor,
        address _selectedExecutor,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        override
        onlyStakedBenefactors(_selectedBenefactor)
        onlyRegisteredExecutors(_selectedExecutor)
    {
        // We should get user here too but np due to stack too deep
        address user;
        IGnosisSafe userGnosisSafeProxy;
        if (isRegisteredUser(msg.sender)) {
            user = msg.sender;
            userGnosisSafeProxy = gnosisSafeProxyByUser[msg.sender];
        } else if (isRegisteredGnosisSafeProxy(IGnosisSafe(msg.sender))) {
            user = userByGnosisSafeProxy[msg.sender];
            userGnosisSafeProxy = IGnosisSafe(msg.sender);
        } else {
            revert(
                "GelatoCore.mintExecutionClaim: caller must be registered user or proxy"
            );
        }

        // Mint new executionClaim
        executionClaimIds.increment();
        uint256 executionClaimId = executionClaimIds.current();
        gnosisSafeProxyByExecutionClaimId[executionClaimId] = userGnosisSafeProxy;

        uint256 executionClaimExpiryDate = now.add(executorClaimLifespan[_selectedExecutor]);

        // ExecutionClaim Hashing
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _selectedBenefactor,
            _selectedExecutor,
            executionClaimId,  // To avoid hash collisions
            user,
            userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            executionClaimExpiryDate,
            msg.value
        );

        emit LogExecutionClaimMinted(
            _selectedExecutor,
            executionClaimId,
            user,
            userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            executionClaimExpiryDate,
            msg.value
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        uint256 _executionClaimId,
        address _s
        address _user,
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
        // _____________ Static CHECKS __________________________________________
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
            msg.sender,  // selected? executor
            _executionClaimId,
            _user,
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
        uint256 _executionClaimId,
        address _user,
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
        (CanExecuteResult canExecuteResult, uint8 canExecuteReason) = canExecute(
            _executionClaimId,
            _user,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _executionClaimExpiryDate
        );

        if (canExecuteResult == CanExecuteResult.Executable) {
            emit LogCanExecuteSuccess(
                msg.sender,
                _executionClaimId,
                _user,
                _condition,
                canExecuteResult,
                canExecuteReason
            );
        } else {
            emit LogCanExecuteFailed(
                msg.sender,
                _executionClaimId,
                _user,
                _condition,
                canExecuteResult,
                canExecuteReason
            );
            return;  // END OF EXECUTION
        }


        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete gnosisSafeProxyByExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        bool actionExecuted;
        string memory executionFailureReason;

        try _userGnosisSafeProxy.execTransactionFromModuleReturnData(
            address(_action),  // to
            0,  // value
            _actionPayloadWithSelector,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool success, bytes memory actionRevertReason) {
            actionExecuted = success;
            if (!actionExecuted) {
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


        uint256 executionCostEstimate = startGas - gasleft() - tx.gasprice;

        if (actionExecuted) {
            emit LogSuccessfulExecution(
                msg.sender,  // selectedExecutor
                _executionClaimId,
                _user,
                _condition,
                _action,
                tx.gasprice,
                // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
                executionCostEstimate,
                executionCostEstimate * adminGasPrice + 5 finney  // refund + reward
            );
            // Executor gets full reward only if Execution was successful
            executorBalance[msg.sender] = executorBalance[msg.sender].add(
                (startGas.sub(gasleft())).mul(adminGasPrice).add(5 finney)  // refund + reward
            );
        } else {
            emit LogExecutionFailure(
                msg.sender,  // selectedExecutor
                _executionClaimId,
                _user,
                _condition,
                _action,
                executionFailureReason,
                executionCostEstimate,
                executionCostEstimate * adminGasPrice // executorRefund
            );
            executorBalance[msg.sender] = executorBalance[msg.sender].add(
                (startGas.sub(gasleft())).mul(adminGasPrice)  // refund
            );
        }
    }

    // ================  CANCEL USER / EXECUTOR API ============================
    function cancelExecutionClaim(
        address _selectedExecutor,
        uint256 _executionClaimId,
        address _user,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _conditionGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        bool executionClaimExpired = _executionClaimExpiryDate <= now;
        if (msg.sender != _user && IGnosisSafe(msg.sender) != _userGnosisSafeProxy) {
            require(
                executionClaimExpired && msg.sender == _selectedExecutor,
                "GelatoCore.cancelExecutionClaim: msgSender problem"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _selectedExecutor,
            _executionClaimId,
            _user,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _conditionGasActionGasMinExecutionGas,
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
            _user,
            msg.sender,
            executionClaimExpired
        );
        // Interactions
        msg.sender.sendValue(_mintingDeposit);
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
        address _selectedExecutor,
        uint256 _executionClaimId,
        address _user,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes memory _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        pure
        returns(bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _selectedExecutor,
                _executionClaimId,
                _user,
                _userGnosisSafeProxy,
                _condition,
                _conditionPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _executionClaimExpiryDate,
                _mintingDeposit
            )
        );
    }

    // ================ GAS BENCHMARKING ==============================================
    function gasTestConditionCheck(
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        uint256 _conditionGas
    )
        external
        view
        override
        returns(bool conditionReached, uint8 reason)
    {
        uint256 startGas = gasleft();
        /* solhint-disable indent */
        (bool success,
         bytes memory returndata) = address(_condition).staticcall.gas(_conditionGas)(
            _conditionPayloadWithSelector
        );
        /* solhint-enable indent */
        if (!success) revert("GelatoCore.gasTestConditionCheck: Unhandled Error/wrong Args");
        else (conditionReached, reason) = abi.decode(returndata, (bool, uint8));
        if (conditionReached) revert(string(abi.encodePacked(startGas - gasleft())));
        else revert("GelatoCore.gasTestConditionCheck: Not Executable/wrong Args");
    }

    function gasTestCanExecute(
        uint256 _executionClaimId,
        address _user,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _conditionGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        override
        returns (CanExecuteResult canExecuteResult, uint8 reason)
    {
        uint256 startGas = gasleft();
        (canExecuteResult, reason) = canExecute(
            _executionClaimId,
            _user,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _conditionGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        if (canExecuteResult == CanExecuteResult.Executable)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.gasTestCanExecute: Not Executable/Wrong Args");
    }

    function gasTestGnosisSafeExecuteFromModule(
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionGas
    )
        external
        override
        onlyRegisteredGnosisSafeProxies(_userGnosisSafeProxy)
    {
        uint256 startGas = gasleft();
        bool actionExecuted;
        string memory executionFailureReason;

        try _userGnosisSafeProxy.execTransactionFromModuleReturnData{ gas: _executionGas }(
            address(_action),  // to
            0,  // value
            _actionPayloadWithSelector,  // data
            IGnosisSafe.Operation.DelegateCall
        ) returns (bool success, bytes memory actionRevertReason) {
            actionExecuted = success;
            if (!actionExecuted) {
                // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 revertReason
                assembly { actionRevertReason := add(actionRevertReason, 68) }
                executionFailureReason = string(actionRevertReason);
            }
            revert(string(abi.encodePacked(startGas - gasleft())));
        } catch Error(string memory gnosisSafeProxyRevertReason) {
            executionFailureReason = gnosisSafeProxyRevertReason;
            revert("GelatoCore.gasTestTestUserProxyExecute: Defined Error Caught");
        } catch {
            revert("GelatoCore.gasTestTestUserProxyExecute: Undefined Error Caught");
        }
    }

    function gasTestExecute(
        uint256 _executionClaimId,
        address _user,
        IGnosisSafe _userGnosisSafeProxy,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _conditionGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        uint256 startGas = gasleft();
        execute(
            _executionClaimId,
            _user,
            _userGnosisSafeProxy,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _conditionGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }
}