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
        if (_isUser(msg.sender)) userProxy = proxyByUser[msg.sender];
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
            msg.sender,  // _user
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
        address _user,
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
            _user,
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
        address _user,
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
        if (msg.sender != userByProxy[address(_userProxy)]) {
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
        IGelatoUserProxy userProxy = userProxyWithExecutionClaimId[_executionClaimId];
        return userByProxy[address(userProxy)];
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
        address _user,
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
        require(
            startGas >= _triggerGasActionGasMinExecutionGas[2].sub(30000),
            "GelatoCore._execute: Insufficient gas sent"
        );

        // _______ canExecute() CHECK ______________________________________________
        {
            GelatoCoreEnums.CanExecuteResults canExecuteResult;
            uint8 canExecuteReason;
            (canExecuteResult, canExecuteReason) = _canExecute(
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

            if (canExecuteResult == GelatoCoreEnums.CanExecuteResults.Executable) {
                emit LogCanExecuteSuccess(
                    msg.sender,
                    _executionClaimId,
                    _user,
                    _trigger,
                    canExecuteResult,
                    canExecuteReason
                );
            } else {
                emit LogCanExecuteFailed(
                    msg.sender,
                    _executionClaimId,
                    _user,
                    _trigger,
                    canExecuteResult,
                    canExecuteReason
                );
                return;  // END OF EXECUTION
            }
        }

        // EFFECTS
        delete executionClaimHash[_executionClaimId];
        delete userProxyWithExecutionClaimId[_executionClaimId];

        // INTERACTIONS
        bool actionExecuted;
        string memory executionFailureReason;
        try _userProxy.delegatecallGelatoAction(
            _action,
            _actionPayloadWithSelector,
            _triggerGasActionGasMinExecutionGas[1]
        ) {
            actionExecuted = true;
        } catch Error(string memory revertReason) {
            executionFailureReason = revertReason;
        } catch {
            executionFailureReason = "UnhandledUserProxyError";
        }

        if (actionExecuted) {
            emit LogSuccessfulExecution(
                msg.sender,  // executor
                _executionClaimId,
                _user,
                _trigger,
                _action,
                tx.gasprice,
                // ExecutionCost Estimate: ignore fn call overhead, due to delete gas refunds
                (startGas.sub(gasleft())).mul(tx.gasprice),
                _mintingDeposit  // executorReward
            );
            // Executor gets full reward only if Execution was successful
            executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
        } else {
            address payable payableUser = address(uint160(_user));
            emit LogExecutionFailure(
                msg.sender,
                _executionClaimId,
                payableUser,
                _trigger,
                _action,
                executionFailureReason
            );
            // Transfer Minting deposit back to user
            payableUser.sendValue(_mintingDeposit);
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
    {
        // Always reverts inside GelatoGasTestUserProxy.executeDelegateCall
        _gasTestUserProxy.delegatecallGelatoAction(
            _action,
            _actionPayloadWithSelector,
            _actionGas
        );
        revert("GelatoCore.gasTestActionViaGasTestUserProxy: did not revert");
    }

    function gasTestGasTestUserProxyExecute(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        override
        userProxyCheck(_userProxy)
    {
        uint256 startGas = gasleft();
        bool actionExecuted;
        string memory executionFailureReason;
        try _userProxy.delegatecallGelatoAction(
            _action,
            _actionPayloadWithSelector,
            _actionGas
        ) {
            actionExecuted = true;
            revert(string(abi.encodePacked(startGas - gasleft())));
        } catch Error(string memory reason) {
            executionFailureReason = reason;
            revert("GelatoCore.gasTestTestUserProxyExecute: Defined Error Caught");
        } catch {
            revert("GelatoCore.gasTestTestUserProxyExecute: Undefined Error Caught");
        }
    }

    function gasTestExecute(
        uint256 _executionClaimId,
        address payable _user,
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
            _user,
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