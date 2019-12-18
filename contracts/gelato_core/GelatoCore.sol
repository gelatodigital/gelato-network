pragma solidity 0.6.0;

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
    // executionClaimId => userProxyByExecutionClaimId
    mapping(uint256 => IGelatoUserProxy) private userProxyByExecutionClaimId;
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) private hashedExecutionClaims;

    // ================  MINTING ==============================================
    function mintExecutionClaim(
        address payable _selectedExecutor,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable
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
            uint256 triggerGas = _trigger.getTriggerGas();
            require(triggerGas != 0, "GelatoCore.mintExecutionClaim: 0 triggerGas");
            triggerGasActionTotalGasMinExecutionGas[0] = triggerGas;

            uint256 actionTotalGas = _action.getActionTotalGas();
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
        userProxyByExecutionClaimId[executionClaimId] = userProxy;
        // =============
        // ______ ExecutionClaim Hashing ______________________________________
        uint256 executionClaimExpiryDate = now.add(executorClaimLifespan[_selectedExecutor]);

        // Include executionClaimId to avoid hash collisions
        hashedExecutionClaims[executionClaimId] = _computeExecutionClaimHash(
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
        returns(GelatoCoreEnums.ExecutionResult executionResult)
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
        address payable _selectedExecutor,
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
            computedExecutionClaimHash == hashedExecutionClaims[_executionClaimId],
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );
        // Effects
        delete userProxyByExecutionClaimId[_executionClaimId];
        delete hashedExecutionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(_executionClaimId, _userProxy, msg.sender);
        // Interactions
        msg.sender.sendValue(_mintingDeposit);
    }

    // ================  STATE READERS ======================================
    function getCurrentExecutionClaimId()
        external
        view
        returns(uint256 currentId)
    {
        currentId = executionClaimIds.current();
    }

    function getUserProxyWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(IGelatoUserProxy)
    {
        return userProxyByExecutionClaimId[_executionClaimId];
    }

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address)
    {
        IGelatoUserProxy userProxy = userProxyByExecutionClaimId[_executionClaimId];
        return proxyToUser[address(userProxy)];
    }

    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        view
        returns(bytes32)
    {
        return hashedExecutionClaims[_executionClaimId];
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
        if (computedExecutionClaimHash != hashedExecutionClaims[_executionClaimId])
            return GelatoCoreEnums.CanExecuteCheck.WrongCalldataOrAlreadyDeleted;
        else if (userProxyByExecutionClaimId[_executionClaimId] == IGelatoUserProxy(0))
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
    function _executeActionViaUserProxy(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _actionGas
    )
        private
        returns (bool success)
    {
        bytes memory userProxyExecPayloadWithSelector = abi.encodeWithSelector(
            _userProxy.executeDelegatecall.selector,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
        (success,) = address(_userProxy).call(userProxyExecPayloadWithSelector);
    }


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
        returns(GelatoCoreEnums.ExecutionResult executionResult)
    {
        uint256 startGas = gasleft();
        require(
            startGas >= _triggerGasActionTotalGasMinExecutionGas[2],
            "GelatoCore._execute: Insufficient gas sent"
        );

        uint256 actionGas = _action.getActionGas();
        require(actionGas != 0, "GelatoCore._execute: 0 actionGas");

        uint256 actionConditionsOkGas = _triggerGasActionTotalGasMinExecutionGas[1].sub(actionGas);
        require(actionConditionsOkGas != 0, "GelatoCore._execute: 0 actionConditionsOkGas");

        // _______ canExecute() CHECK ______________________________________________
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
            return GelatoCoreEnums.ExecutionResult.CanExecuteFailed;
        }

        // Above the executor pays for reverts (e.g. canExecute reverts)
        // -------------------------------------------------------------
        // From below the user pays for reverts (e.g. action reverts)

        // EFFECTS
        delete hashedExecutionClaims[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        bool success = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            actionGas
        );
        if (success) executionResult = GelatoCoreEnums.ExecutionResult.Success;
        // if execution fails, no revert, and executor still rewarded
        // solhint-disable-next-line indent
        else executionResult = GelatoCoreEnums.ExecutionResult.Failure;

        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);

        emit LogClaimExecutedAndDeleted(
            msg.sender,  // executor
            _executionClaimId,
            executionResult,
            tx.gasprice,
            // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
            gasleft().sub(startGas).mul(tx.gasprice),
            _mintingDeposit  // executorReward
        );
    }

    // ================ EXECUTION CLAIM HASHING ========================================
    function _computeExecutionClaimHash(
        address payable _selectedExecutor,
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
        returns(uint256)
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
        returns(uint256)
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
        returns(uint256)
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
        gasTestProxyCheck(address(_gasTestUserProxy))
        returns(uint256)
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
        userProxyCheck(_userProxy)
        returns(uint256)
    {
        uint256 startGas = gasleft();
        bool success = _executeActionViaUserProxy(
            _userProxy,
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
        if (success) revert(string(abi.encodePacked(startGas - gasleft())));
        // solhint-disable-next-line max-line-length
        revert("GelatoCore.revertLogGasTestUserProxyExecute: UserProxy or Action reverted, or wrong arguments supplied");
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
        returns(uint256)
    {
        uint256 startGas = gasleft();
        GelatoCoreEnums.ExecutionResult executionResult = _execute(
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
        if (executionResult == GelatoCoreEnums.ExecutionResult.Success)
            revert(string(abi.encodePacked(startGas - gasleft())));
        revert("GelatoCore.revertLogGasExecute: ExecutionResult: Failure (wrong arguments supplied?)");
    }

}