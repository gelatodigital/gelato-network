pragma solidity ^0.6.0;

import "./interfaces/IGelatoCore.sol";
import "./GelatoUserProxyManager.sol";
import "./GelatoCoreAccounting.sol";
import "@openzeppelin/contracts/drafts/Counters.sol";

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
    //

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
        uint256[3] memory triggerGasActionTotalGasMinExecutionGas;
        {
            uint256 triggerGas = _trigger.triggerGas();
            require(triggerGas != 0, "GelatoCore.mintExecutionClaim: 0 triggerGas");
            triggerGasActionTotalGasMinExecutionGas[0] = triggerGas;

            uint256 actionTotalGas = _action.actionTotalGas();
            require(actionTotalGas != 0, "GelatoCore.mintExecutionClaim: 0 actionTotalGas");
            triggerGasActionTotalGasMinExecutionGas[1] = actionTotalGas;

            uint256 minExecutionGas = _getMinExecutionGas(triggerGas, actionTotalGas);
            triggerGasActionTotalGasMinExecutionGas[2] = minExecutionGas;

            require(
                msg.value == minExecutionGas.mul(executorPrice[_selectedExecutor]),
                "GelatoCore.mintExecutionClaim: msg.value failed"
            );
        }

        // =============
        // ______ Mint new executionClaim ______________________________________
        Counters.increment(executionClaimIds);
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
            triggerGasActionTotalGasMinExecutionGas,
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
            triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        override
        returns (GelatoCoreEnums.CanExecuteCheck)
    {
        return _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionTotalGasMinExecutionGas,
            _actionConditionsOkGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
        returns(GelatoCoreEnums.ExecutionResult executionResult, uint8 errorCode)
    {
        return _execute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
    {
        if (msg.sender != proxyToUser[address(_userProxy)]) {
            require(
                _executionClaimExpiryDate <= now && msg.sender == _selectedExecutor,
                "GelatoCore.cancelExecutionClaim: only selected executor post expiry"
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
            _triggerGasActionTotalGasMinExecutionGas,
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
        emit LogExecutionClaimCancelled(_executionClaimId, _userProxy, msg.sender);
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
    function _triggerCheck(
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        uint256 _triggerGas
    )
        private
        view
        returns(GelatoCoreEnums.TriggerCheck)
    {
        /* solhint-disable indent */
        (bool success,
         bytes memory returndata) = address(_trigger).staticcall.gas(_triggerGas)(
            _triggerPayloadWithSelector
        );
        /* solhint-enable indent */
        if (!success) return GelatoCoreEnums.TriggerCheck.Reverted;
        else {
            bool executable = abi.decode(returndata, (bool));
            if (!executable) return GelatoCoreEnums.TriggerCheck.NotFired;
            return GelatoCoreEnums.TriggerCheck.Fired;
        }
    }

    function _actionConditionsCheck(
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _actionConditionsOkGas
    )
        private
        view
        returns(GelatoCoreEnums.ActionConditionsCheck)
    {
        bytes memory actionConditionsOkPayloadWithSelector = abi.encodeWithSelector(
            _action.actionConditionsOk.selector,
            _actionPayloadWithSelector
        );
        /* solhint-disable indent */
        (bool success,
         bytes memory returndata) = address(_action).staticcall.gas(_actionConditionsOkGas)(
            actionConditionsOkPayloadWithSelector
        );
        /* solhint-enable  indent */
        if (!success) return GelatoCoreEnums.ActionConditionsCheck.Reverted;
        else {
            bool executable = abi.decode(returndata, (bool));
            if (!executable) return GelatoCoreEnums.ActionConditionsCheck.NotOk;
            return GelatoCoreEnums.ActionConditionsCheck.Ok;
        }
    }

    function _canExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256[3] memory _triggerGasActionTotalGasMinExecutionGas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        view
        returns (GelatoCoreEnums.CanExecuteCheck)
    {
        // _____________ Static CHECKS __________________________________________
        bytes32 computedExecutionClaimHash = _computeExecutionClaimHash(
            msg.sender,  // selected? executor
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionTotalGasMinExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        /* solhint-disable indent */
        if (computedExecutionClaimHash != executionClaimHash[_executionClaimId])
            return GelatoCoreEnums.CanExecuteCheck.WrongCalldataOrAlreadyDeleted;
        else if (userProxyWithExecutionClaimId[_executionClaimId] == IGelatoUserProxy(0))
            return GelatoCoreEnums.CanExecuteCheck.NonExistantExecutionClaim;
        else if (_executionClaimExpiryDate < now)
            return GelatoCoreEnums.CanExecuteCheck.ExecutionClaimExpired;

        // _____________ Dynamic CHECKS __________________________________________
        GelatoCoreEnums.TriggerCheck triggerCheck = _triggerCheck(
            _trigger,
            _triggerPayloadWithSelector,
            _triggerGasActionTotalGasMinExecutionGas[0]
        );

        bool triggerFired;
        if (triggerCheck == GelatoCoreEnums.TriggerCheck.Fired) triggerFired = true;
        else if (triggerCheck == GelatoCoreEnums.TriggerCheck.NotFired)
            return GelatoCoreEnums.CanExecuteCheck.TriggerNotFired;
        else return GelatoCoreEnums.CanExecuteCheck.TriggerReverted;

        GelatoCoreEnums.ActionConditionsCheck actionCheck = _actionConditionsCheck(
            _action,
            _actionPayloadWithSelector,
            _actionConditionsOkGas
        );

        if (triggerFired && (actionCheck == GelatoCoreEnums.ActionConditionsCheck.Ok))
            return GelatoCoreEnums.CanExecuteCheck.Executable;
        else if (actionCheck == GelatoCoreEnums.ActionConditionsCheck.NotOk)
            return GelatoCoreEnums.CanExecuteCheck.ActionConditionsNotOk;
        else return GelatoCoreEnums.CanExecuteCheck.ActionReverted;
        /* solhint-enable indent */
    }


    // ================  EXECUTE IMPLEMENTATION ======================================
    function _execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256[3] memory _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        returns(GelatoCoreEnums.ExecutionResult executionResult, uint8 errorCode)
    {
        uint256 startGas = gasleft();
        require(
            startGas >= _triggerGasActionTotalGasMinExecutionGas[2],
            "GelatoCore._execute: Insufficient gas sent"
        );

        uint256 actionGas = _action.actionGas();
        require(actionGas != 0, "GelatoCore._execute: 0 actionGas");

        // _______ canExecute() CHECK ______________________________________________
        {
            uint256 actionConditionsOkGas = _triggerGasActionTotalGasMinExecutionGas[1].sub(
                actionGas
            );
            require(actionConditionsOkGas != 0, "GelatoCore._execute: 0 actionConditionsOkGas");

            GelatoCoreEnums.CanExecuteCheck canExecuteResult = _canExecute(
                _executionClaimId,
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _triggerGasActionTotalGasMinExecutionGas,
                actionConditionsOkGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            );

            if (canExecuteResult != GelatoCoreEnums.CanExecuteCheck.Executable) {
                emit LogCanExecuteFailed(
                    msg.sender,
                    _executionClaimId,
                    canExecuteResult
                );
                return (GelatoCoreEnums.ExecutionResult.CanExecuteFailed, 0);
            }
        }

        // Above the executor pays for reverts (e.g. canExecute reverts)
        // -------------------------------------------------------------
        // From below the user pays for reverts (e.g. action reverts)

        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete userProxyWithExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        (executionResult, errorCode) = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            actionGas
        );

        if (executionResult == GelatoCoreEnums.ExecutionResult.Success) {
            emit LogSuccessfulExecution(
                msg.sender,  // executor
                _executionClaimId,
                _trigger,
                _action,
                tx.gasprice,
                // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
                gasleft().sub(startGas).mul(tx.gasprice),
                _mintingDeposit  // executorReward
            );
        } else {
            emit LogExecutionFailure(msg.sender, _executionClaimId, _trigger, _action);
            //executionResult = GelatoCoreEnums.ExecutionResult.Failure;
        }

        // Executor gets full reward from user no matter if execution successful or not
        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
    }

<<<<<<< HEAD
        emit LogClaimExecutedAndDeleted(
            msg.sender,  // executor
            _executionClaimId,
            executionResult,
            tx.gasprice,
            // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
            (startGas.sub(gasleft())).mul(tx.gasprice),
            _mintingDeposit  // executorReward
        );
=======
   function _executeActionViaUserProxy(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _actionGas
    )
        private
        returns (GelatoCoreEnums.ExecutionResult, uint8 errorCode)
    {
        try _userProxy.executeDelegatecall(
            _action,
            _actionPayloadWithSelector,
            _actionGas
        ) returns (uint8 _executionResult, uint8 _errorCode) {
            return (GelatoCoreEnums.ExecutionResult(_executionResult), _errorCode);
        } catch {
            return (GelatoCoreEnums.ExecutionResult.UserProxyFailure, 0);
        }
>>>>>>> luis-try-catch
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
        uint256[3] memory _triggerGasActionTotalGasMinExecutionGas,
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
                _triggerGasActionTotalGasMinExecutionGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            )
        );
    }

    // ================ GAS BENCHMARKING ==============================================
    function revertLogGasTriggerCheck(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas
    )
        external
        view
        override
        returns(GelatoCoreEnums.TriggerCheck)
    {
        uint256 startGas = gasleft();
        GelatoCoreEnums.TriggerCheck triggerCheckResult = _triggerCheck(
            _trigger,
            _triggerPayloadWithSelector,
            _triggerGas
        );
        if (triggerCheckResult == GelatoCoreEnums.TriggerCheck.Fired)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.revertLogTriggerCheckGas: Trigger didnt fire, or reverted, or wrong arguments supplied");
    }

    function revertLogGasActionConditionsCheck(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionConditionsOkGas
    )
        external
        view
        override
        returns(GelatoCoreEnums.ActionConditionsCheck)
    {
        uint256 startGas = gasleft();
        GelatoCoreEnums.ActionConditionsCheck actionCheck = _actionConditionsCheck(
            _action,
            _actionPayloadWithSelector,
            _actionConditionsOkGas
        );
        if (actionCheck == GelatoCoreEnums.ActionConditionsCheck.Ok)
            revert(string(abi.encodePacked(startGas - gasleft())));
        // solhint-disable-next-line max-line-length
        revert("GelatoCore.revertLogActionConditionsCheckGas: Action Conditions NOT Ok, or reverted, or wrong arguments supplied");
    }


    function revertLogGasCanExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        override
        returns(GelatoCoreEnums.CanExecuteCheck)
    {
        uint256 startGas = gasleft();
        GelatoCoreEnums.CanExecuteCheck canExecuteResult = _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionTotalGasMinExecutionGas,
            _actionConditionsOkGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        if (canExecuteResult == GelatoCoreEnums.CanExecuteCheck.Executable)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.revertLogCanExecuteGas: CanExecuteCheck: Not Executable, or wrong arguments supplied");
    }

    function revertLogGasActionViaGasTestUserProxy(
        IGelatoUserProxy _gasTestUserProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        override
        gasTestProxyCheck(address(_gasTestUserProxy))
        returns(GelatoCoreEnums.ExecutionResult, uint8 errorCode)
    {
        // Always reverts inside GelatoGasTestUserProxy.executeDelegateCall
        _executeActionViaUserProxy(
            _gasTestUserProxy,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
    }

    function revertLogGasTestUserProxyExecute(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        override
        userProxyCheck(_userProxy)
        returns(GelatoCoreEnums.ExecutionResult executionResult, uint8 errorCode)
    {
        uint256 startGas = gasleft();
        (executionResult, errorCode) = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }

    function revertLogGasExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        override
        returns(GelatoCoreEnums.ExecutionResult, uint8)
    {
        uint256 startGas = gasleft();
        {
            _execute(
                _executionClaimId,
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _triggerGasActionTotalGasMinExecutionGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            );
        }
        revert(string(abi.encodePacked(startGas - gasleft())));
    }
}