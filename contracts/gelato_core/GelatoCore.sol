pragma solidity ^0.6.0;

import "./interfaces/IGelatoCore.sol";
import "./GelatoUserProxyManager.sol";
import "./GelatoCoreAccounting.sol";
import "../external/Counters.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancellation
/// @dev Find all NatSpecs inside IGelatoCore
contract GelatoCore is IGelatoCore, GelatoUserProxyManager, GelatoCoreAccounting {

    // Library for unique ExecutionClaimIds
    using Counters for Counters.Counter;
    using Address for address payable;  /// for oz's sendValue method

    // ================  STATE VARIABLES ======================================
    Counters.Counter private executionClaimIds;
    // executionClaimId => userProxyWithExecutionClaimId
    mapping(uint256 => IGelatoUserProxy) public override userProxyWithExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public override executionClaimHash;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address _selectedExecutor,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable
        override
        onlyRegisteredExecutors(_selectedExecutor)
    {
        // ______ Authenticate msg.sender is proxied user or a proxy _______
        IGelatoUserProxy userProxy;
        if (_isUser(msg.sender)) userProxy = userToProxy[msg.sender];
        else if (_isUserProxy(msg.sender)) userProxy = IGelatoUserProxy(msg.sender);
        // solhint-disable-next-line
        else revert("GelatoCore.mintExecutionClaim: msg.sender is not proxied");
        // =============
        // ______ Read Gas Values & Charge Minting Deposit _______________________
        uint256[3] memory triggerGasActionGasMinExecutionGas;
        {
            uint256 triggerGas = _trigger.triggerGas();
            require(triggerGas != 0, "GelatoCore.mintExecutionClaim: 0 triggerGas");
            triggerGasActionGasMinExecutionGas[0] = triggerGas;

            uint256 actionGas = _action.actionGas();
            require(actionGas != 0, "GelatoCore.mintExecutionClaim: 0 actionGas");
            triggerGasActionGasMinExecutionGas[1] = actionGas;

            uint256 minExecutionGas = _getMinExecutionGas(triggerGas, actionGas);
            triggerGasActionGasMinExecutionGas[2] = minExecutionGas;

            require(
                msg.value == minExecutionGas.mul(executorPrice[_selectedExecutor]),
                "GelatoCore.mintExecutionClaim: msg.value failed"
            );
        }

        // =============
        // ______ Mint new executionClaim ______________________________________
        executionClaimIds.increment();
        uint256 executionClaimId = executionClaimIds.current();
        userProxyWithExecutionClaimId[executionClaimId] = userProxy;
        // =============
        // ______ ExecutionClaim Hashing ______________________________________
        uint256 executionClaimExpiryDate = now.add(executorClaimLifespan[_selectedExecutor]);

        // Include executionClaimId to avoid hash collisions
        executionClaimHash[executionClaimId] = _computeExecutionClaimHash(
            _selectedExecutor,
            executionClaimId,
            userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            triggerGasActionGasMinExecutionGas,
            executionClaimExpiryDate,
            msg.value
        );

        // =============
        emit LogExecutionClaimMinted(
            _selectedExecutor,
            executionClaimId,
            userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            triggerGasActionGasMinExecutionGas,
            executionClaimExpiryDate,
            msg.value
        );
    }

    // ================  CAN EXECUTE EXECUTOR API ============================
    function canExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        override
        returns (GelatoCoreEnums.CanExecuteResults, uint8 reason)
    {
        return _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
    }

    // ================  EXECUTE SUITE ======================================
    function execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        return _execute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
    }

    function cancelExecutionClaim(
        address _selectedExecutor,
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        bool executionClaimExpired = _executionClaimExpiryDate <= now;
        if (msg.sender != proxyToUser[address(_userProxy)]) {
            require(
                executionClaimExpired && msg.sender == _selectedExecutor,
                "GelatoCore.cancelExecutionClaim: msgSender problem"
            );
        }
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            _selectedExecutor,
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        // Checks
        require(
            computedExecutionClaimHash == executionClaimHash[_executionClaimId],
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );
        // Effects
        delete userProxyWithExecutionClaimId[_executionClaimId];
        delete executionClaimHash[_executionClaimId];
        emit LogExecutionClaimCancelled(
            _executionClaimId,
            _userProxy,
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
        IGelatoUserProxy userProxy = userProxyWithExecutionClaimId[_executionClaimId];
        return proxyToUser[address(userProxy)];
    }


    // ================  CAN EXECUTE IMPLEMENTATION ==================================
    function _canExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256[3] memory _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        view
        returns (GelatoCoreEnums.CanExecuteResults, uint8 reason)
    {
        // _____________ Static CHECKS __________________________________________
        if (executionClaimHash[_executionClaimId] == bytes32(0)) {
            if (_executionClaimId <= executionClaimIds.current()) {
                return (
                    GelatoCoreEnums.CanExecuteResults.ExecutionClaimAlreadyExecutedOrCancelled,
                    uint8(GelatoCoreEnums.StandardReason.NotOk)
                );
            } else {
                return (
                    GelatoCoreEnums.CanExecuteResults.ExecutionClaimNonExistant,
                    uint8(GelatoCoreEnums.StandardReason.NotOk)
                );
            }
        }

        if (_executionClaimExpiryDate < now) {
            return (
                GelatoCoreEnums.CanExecuteResults.ExecutionClaimExpired,
                uint8(GelatoCoreEnums.StandardReason.NotOk)
            );
        }

        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            msg.sender,  // selected? executor
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );

        if (computedExecutionClaimHash != executionClaimHash[_executionClaimId]) {
            return (
                GelatoCoreEnums.CanExecuteResults.WrongCalldata,
                uint8(GelatoCoreEnums.StandardReason.NotOk)
            );
        }

        // _____________ Dynamic CHECKS __________________________________________
        // **** Trigger Check *****
        (bool success, bytes memory returndata)
            = address(_trigger).staticcall.gas(_triggerGasActionGasMinExecutionGas[0])(
                _triggerPayloadWithSelector
        );

        if (!success) {
            return (
                GelatoCoreEnums.CanExecuteResults.UnhandledTriggerError,
                uint8(GelatoCoreEnums.StandardReason.UnhandledError)
            );
        } else {
            bool triggerFired;
            (triggerFired, reason) = abi.decode(returndata, (bool, uint8));
            if (!triggerFired) return (GelatoCoreEnums.CanExecuteResults.TriggerNotOk, reason);
            // Trigger Fired
            else return (GelatoCoreEnums.CanExecuteResults.Executable, reason);
        }
    }

    // ================  EXECUTE IMPLEMENTATION ======================================
    function _execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256[3] memory _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
    {
        uint256 startGas = gasleft();
        // CAUTION NEEDS FIXING <= need to account for gas overhead otherwise reverts
        require(
            startGas >= _triggerGasActionGasMinExecutionGas[2],
            "GelatoCore._execute: Insufficient gas sent"
        );

        // _______ canExecute() CHECK ______________________________________________
        GelatoCoreEnums.CanExecuteResults canExecuteResult;
        uint8 reason;
        (canExecuteResult, reason) = _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );

        if (canExecuteResult != GelatoCoreEnums.CanExecuteResults.Executable) {
            emit LogCanExecuteFailed(
                msg.sender,
                _executionClaimId,
                _trigger,
                _action,
                canExecuteResult,
                reason
            );
            return;  // END OF EXECUTION
        }


        // Above the executor pays for Unsuccessful Execution
        // ---------------------------------------------------
        // From below the user pays for Unsuccessful Execution

        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete userProxyWithExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        GelatoCoreEnums.ExecutionResults executionResult;
        (executionResult, reason) = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas[1]
        );

        if (executionResult == GelatoCoreEnums.ExecutionResults.Success) {
            emit LogSuccessfulExecution(
                msg.sender,  // executor
                _executionClaimId,
                _trigger,
                _action,
                tx.gasprice,
                // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
                (startGas.sub(gasleft())).mul(tx.gasprice),
                _mintingDeposit  // executorReward
            );
        } else {
            emit LogExecutionFailure(
                msg.sender,
                _executionClaimId,
                _trigger,
                _action,
                executionResult,
                reason
            );
        }

        // Executor gets full reward from user no matter if execution successful or not
        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
    }

   function _executeActionViaUserProxy(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _actionGas
    )
        private
        returns (GelatoCoreEnums.ExecutionResults, uint8)  // executable?, reason
    {
        try _userProxy.delegatecallGelatoAction(
            _action,
            _actionPayloadWithSelector,
            _actionGas
        ) returns (uint8 _executionResult, uint8 _reason) {
            return (GelatoCoreEnums.ExecutionResults(_executionResult), _reason);
        } catch {
            return (
                GelatoCoreEnums.ExecutionResults.UnhandledUserProxyError,
                uint8(GelatoCoreEnums.StandardReason.UnhandledError)
            );
        }
    }


    // ================ EXECUTION CLAIM HASHING ========================================
    function _computeExecutionClaimHash(
        address _selectedExecutor,
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256[3] memory _triggerGasActionGasMinExecutionGas,
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
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _triggerGasActionGasMinExecutionGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            )
        );
    }

    // ================ GAS BENCHMARKING ==============================================
    function gasTestTriggerCheck(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas
    )
        external
        view
        override
        returns(bool triggerFired, uint8 reason)
    {
        uint256 startGas = gasleft();
        /* solhint-disable indent */
        (bool success,
         bytes memory returndata) = address(_trigger).staticcall.gas(_triggerGas)(
            _triggerPayloadWithSelector
        );
        /* solhint-enable indent */
        if (!success) revert("GelatoCore.gasTestTriggerCheck: Unhandled Error/wrong Args");
        else (triggerFired, reason) = abi.decode(returndata, (bool, uint8));
        if (triggerFired) revert(string(abi.encodePacked(startGas - gasleft())));
        else revert("GelatoCore.gasTestTriggerCheck: Not Executable/wrong Args");
    }

    function gasTestCanExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        override
        returns (GelatoCoreEnums.CanExecuteResults canExecuteResult, uint8 reason)
    {
        uint256 startGas = gasleft();
        (canExecuteResult, reason) = _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        if (canExecuteResult == GelatoCoreEnums.CanExecuteResults.Executable)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.gasTestCanExecute: Not Executable/Wrong Args");
    }

    function gasTestActionViaGasTestUserProxy(
        IGelatoUserProxy _gasTestUserProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        override
        gasTestProxyCheck(address(_gasTestUserProxy))
        returns(GelatoCoreEnums.ExecutionResults executionResult, uint8 reason)
    {
        // Always reverts inside GelatoGasTestUserProxy.executeDelegateCall
        (executionResult, reason) = _executeActionViaUserProxy(
            _gasTestUserProxy,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
    }

    function gasTestTestUserProxyExecute(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        override
        userProxyCheck(_userProxy)
        returns(GelatoCoreEnums.ExecutionResults executionResult, uint8 reason)
    {
        uint256 startGas = gasleft();
        (executionResult, reason) = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
        if (executionResult == GelatoCoreEnums.ExecutionResults.Success)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.gasTestTestUserProxyExecute: Not Executed/Wrong Args");
    }

    function gasTestExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        uint256 startGas = gasleft();
        _execute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }
}