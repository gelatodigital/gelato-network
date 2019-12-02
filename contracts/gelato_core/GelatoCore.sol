pragma solidity ^0.5.10;

import "./interfaces/IGelatoCore.sol";
import "./GelatoUserProxyManager.sol";
import "./GelatoCoreAccounting.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/drafts/Counters.sol";

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
        else revert("GelatoCore.mintExecutionClaim: msg.sender is not proxied");
        // =============
        // ______ Charge Minting Deposit _______________________________________
        uint256 minExecutionGas;
        {
            uint256 triggerGas = _trigger.getTriggerGas();
            require(triggerGas != 0, "GelatoCore.mintExecutionClaim: 0 triggerGas");
            uint256 actionGasTotal = _action.getActionGasTotal();
            require(actionGasTotal != 0, "GelatoCore.mintExecutionClaim: 0 actionGasTotal");
            minExecutionGas = _getMinExecutionGas(triggerGas, actionGasTotal);
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
        {
            /// @notice Include executionClaimId to avoid hash collisions
            bytes32 executionClaimHash = keccak256(
                abi.encodePacked(
                    _selectedExecutor,
                    executionClaimId,
                    userProxy,
                    _trigger,
                    _triggerPayloadWithSelector,
                    _action,
                    _actionPayloadWithSelector,
                    minExecutionGas,
                    executionClaimExpiryDate,
                    msg.value
                )
            );
            hashedExecutionClaims[executionClaimId] = executionClaimHash;
        }
        // =============
        emit LogExecutionClaimMinted(
            _selectedExecutor,
            executionClaimId,
            userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            minExecutionGas,
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
        uint256 _minExecutionGas,
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
            _minExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
    }

    function logCanExecuteGasViaRevert(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns(GelatoCoreEnums.CanExecuteCheck canExecuteResult)
    {
        uint256 startGas = gasleft();
        canExecuteResult = _canExecute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _minExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }

    // ================  EXECUTE SUITE ======================================
    function execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _minExecutionGas,
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
            _minExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
    }

    function logExecuteGasViaRevert(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult)
    {
        uint256 startGas = gasleft();
        executionResult = _execute(
            _executionClaimId,
            _userProxy,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _minExecutionGas,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
        revert(string(abi.encodePacked(startGas - gasleft())));
    }


    function cancelExecutionClaim(
        address payable _selectedExecutor,
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _minExecutionGas,
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
        bytes32 computedExecutionClaimHash = keccak256(
            abi.encodePacked(
                _selectedExecutor,
                _executionClaimId,
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _minExecutionGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            )
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
        returns(address payable)
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
    function _canExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        view
        returns (GelatoCoreEnums.CanExecuteCheck)
    {
        // _____________ Static CHECKS __________________________________________
        bytes32 computedExecutionClaimHash = keccak256(
            abi.encodePacked(
                msg.sender,  // selected? executor
                _executionClaimId,
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _minExecutionGas,
                _executionClaimExpiryDate,
                _mintingDeposit
            )
        );
        if(computedExecutionClaimHash != hashedExecutionClaims[_executionClaimId]) {
            return GelatoCoreEnums.CanExecuteCheck.WrongCalldataOrAlreadyDeleted;
        } else if (userProxyByExecutionClaimId[_executionClaimId] == IGelatoUserProxy(0)) {
            return GelatoCoreEnums.CanExecuteCheck.NonExistantExecutionClaim;
        } else if (_executionClaimExpiryDate < now) {
            return GelatoCoreEnums.CanExecuteCheck.ExecutionClaimExpired;
        }
        // =========
        // _____________ Dynamic CHECKS __________________________________________
        bool executable;
        {
            // Staticall to trigger (returns(bool))
            uint256 triggerGas = _trigger.getTriggerGas();
            (bool success,
             bytes memory returndata) = address(_trigger).staticcall.gas(triggerGas)(
                _triggerPayloadWithSelector
            );
            if (!success) return GelatoCoreEnums.CanExecuteCheck.TriggerReverted;
            else {
                executable = abi.decode(returndata, (bool));
                if (!executable) return GelatoCoreEnums.CanExecuteCheck.TriggerNotFired;
            }
        }
        {
            // Staticcall to action.actionConditionsFulfilled (returns(bool))
            bytes memory actionConditionsOkPayloadWithSelector = abi.encodeWithSelector(
                _action.actionConditionsOk.selector,
                _actionPayloadWithSelector
            );
            uint256 actionConditionsOkGas = _action.getActionConditionsOkGas();
            (bool success,
             bytes memory returndata) = address(_action).staticcall.gas(actionConditionsOkGas)(
                actionConditionsOkPayloadWithSelector
            );
            if (!success) return GelatoCoreEnums.CanExecuteCheck.ActionReverted;
            else {
                executable = abi.decode(returndata, (bool));
                if (!executable) return GelatoCoreEnums.CanExecuteCheck.ActionConditionsNotOk;
            }
        }
        if (executable) return GelatoCoreEnums.CanExecuteCheck.Executable;
        // ==============
    }


    // ================  EXECUTE IMPLEMENTATION ======================================
    function _execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        private
        returns(GelatoCoreEnums.ExecutionResult executionResult)
    {
        uint256 startGas = gasleft();
        require(startGas >= _minExecutionGas, "GelatoCore.execute: Insufficient gas sent");
        // _______ canExecute() CHECK ______________________________________________
        {
            GelatoCoreEnums.CanExecuteCheck canExecuteResult = _canExecute(
                _executionClaimId,
                _userProxy,
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _minExecutionGas,
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
        }
        // ========

        // Above the executor pays for reverts (e.g. canExecute reverts)
        // -------------------------------------------------------------
        // From below the user pays for reverts (e.g. action reverts)

        // EFFECTS
        delete hashedExecutionClaims[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];
        // _________  call to userProxy.execute => action  __________________________
        {
            bytes memory userProxyExecPayloadWithSelector = abi.encodeWithSelector(
                _userProxy.executeDelegatecall.selector,
                _action,
                _actionPayloadWithSelector
            );
            (bool success,) = address(_userProxy).call(userProxyExecPayloadWithSelector);
            if (success) executionResult = GelatoCoreEnums.ExecutionResult.Success;
            // @dev if execution fails, no revert, because executor still paid out
            else executionResult = GelatoCoreEnums.ExecutionResult.Failure;
        }
        // ========
        // INTERACTIONS
        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
        // ====
        // gasCheck does not have the initial gas and the emit LogClaimExec.. gas
        emit LogClaimExecutedAndDeleted(
            msg.sender,  // executor
            _executionClaimId,
            _userProxy,
            executionResult,
            tx.gasprice,
            gasleft().sub(startGas).add(gelatoCoreExecGasOverhead).mul(tx.gasprice),
            _mintingDeposit
        );
    }
}