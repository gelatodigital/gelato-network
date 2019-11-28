pragma solidity ^0.5.10;

import "./interfaces/IGelatoCore.sol";
import "./GelatoUserProxyManager.sol";
import "./GelatoCoreAccounting.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/drafts/Counters.sol";

/// @title GelatoCore
/// @notice Execution Claim: minting, checking, execution, and cancelation
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
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        address payable _selectedExecutor
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
        uint256 actionGasStipend = _action.getActionGasStipend();
        require(actionGasStipend != 0, "GelatoCore.mintExecutionClaim: 0 actionGasStipend");
        {
            uint256 executionMinGas = _getMinExecutionGasRequirement(actionGasStipend);
            uint256 mintingDepositPayable = executionMinGas.mul(executorPrice[_selectedExecutor]);
            require(
                msg.value == mintingDepositPayable,
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
                    _trigger,
                    _triggerPayloadWithSelector,
                    _action,
                    _actionPayloadWithSelector,
                    userProxy,
                    executionClaimId,
                    _selectedExecutor,
                    userProxyExecGasOverhead.add(actionGasStipend),
                    executionClaimExpiryDate,
                    msg.value
                )
            );
            hashedExecutionClaims[executionClaimId] = executionClaimHash;
        }
        // =============
        emit LogNewExecutionClaimMinted(
            _selectedExecutor,
            executionClaimId,
            userProxy,
            userProxyExecGasOverhead.add(actionGasStipend),
            executionClaimExpiryDate,
            msg.value
        );
        emit LogTriggerActionMinted(
            executionClaimId,
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector
        );
    }


    // ================  EXECUTE SUITE ======================================
    function execute(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _userProxyExecGas,
        uint256 _executionClaimId,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult)
    {
        // Ensure that executor sends enough gas for the execution
        uint256 startGas = gasleft();
        require(
            startGas >= _getMinExecutionGasRequirement(_userProxyExecGas.sub(userProxyExecGasOverhead)),
            "GelatoCore.execute: Insufficient gas sent"
        );
        // _______ canExecute() check ______________________________________________
        {
            GelatoCoreEnums.CanExecuteCheck canExecuteResult = _canExecute(
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _userProxy,
                _userProxyExecGas,
                _executionClaimId,
                _executionClaimExpiryDate,
                _mintingDeposit
            );
            if (canExecuteResult != GelatoCoreEnums.CanExecuteCheck.Executable) {
                emit LogCanExecuteFailed(
                    _executionClaimId,
                    msg.sender,
                    canExecuteResult
                );
                return GelatoCoreEnums.ExecutionResult.CanExecuteFailed;
            }
        }
        // ========
        // _________________________________________________________________________
        //  We are past the canExecute latency problem between executors
        //   initial call to canExecute, and the internal call to canExecute we
        //   performed above inside the execute fn. This means that there should
        //   be NO MORE REVERTS UNLESS
        //   1) trigger, userProxy, and/or action are buggy,
        //   2) user has insufficient funds at disposal at execution time (e.g.
        //   has approved funds, but in the interim has transferred them elsewhere)
        //   3) some out of gas error

        // **** EFFECTS (checks - effects - interactions) ****
        delete hashedExecutionClaims[_executionClaimId];
        delete userProxyByExecutionClaimId[_executionClaimId];
        // _________  call to userProxy.execute => action  __________________________
        {
            bytes memory userProxyExecPayloadWithSelector = abi.encodeWithSelector(
                _userProxy.execute.selector,
                _action,
                _actionPayloadWithSelector
            );
            uint256 gasBefore = gasleft();
            (bool success,) = address(_userProxy).call.gas(_userProxyExecGas)(
                userProxyExecPayloadWithSelector
            );
            emit LogUserProxyExecuteGas(gasBefore, gasleft(), gasBefore - gasleft());
            if (success) executionResult = GelatoCoreEnums.ExecutionResult.Success;
            // @dev if execution fails, no revert, because executor still paid out
            else executionResult = GelatoCoreEnums.ExecutionResult.Failure;
        }
        // ========
        // Balance Updates (INTERACTIONS)
        executorBalance[msg.sender] = executorBalance[msg.sender].add(_mintingDeposit);
        // ====
        // gasCheck does not have the initial gas and the emit LogClaimExec.. gas
        emit LogClaimExecutedAndDeleted(
            _executionClaimId,
            executionResult,
            msg.sender,  // executor
            _userProxy,
            tx.gasprice,
            gasleft().mul(tx.gasprice).add(70000),
            _mintingDeposit,
            gasleft()
        );
    }

    function cancelExecutionClaim(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _executionClaimId,
        address payable _selectedExecutor,
        uint256 _userProxyExecGas,
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
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _userProxy,
                _executionClaimId,
                _selectedExecutor,
                _userProxyExecGas,
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


    // ================  CAN EXECUTE SUITE =======================================
    function canExecute(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _userProxyExecGas,
        uint256 _executionClaimId,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck)
    {
        return _canExecute(
            _trigger,
            _triggerPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _userProxy,
            _userProxyExecGas,
            _executionClaimId,
            _executionClaimExpiryDate,
            _mintingDeposit
        );
    }

    function _canExecute(
        IGelatoTrigger _trigger,
        bytes memory _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes memory _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _userProxyExecGas,
        uint256 _executionClaimId,
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
                _trigger,
                _triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector,
                _userProxy,
                _executionClaimId,
                msg.sender,  // selected? executor
                _userProxyExecGas,
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
            // Call to trigger view (returns(bool))
            (bool success,
             bytes memory returndata) = address(_trigger).staticcall.gas(canExecMaxGas / 2)(
                _triggerPayloadWithSelector
            );
            if (!success) return GelatoCoreEnums.CanExecuteCheck.TriggerReverted;
            else {
                executable = abi.decode(returndata, (bool));
                if (!executable) return GelatoCoreEnums.CanExecuteCheck.TriggerNotFired;
            }
        }
        {
            // Call to action.actionConditionsFulfilled view (returns(bool))
            bytes memory actionConditionsOkPayloadWithSelector = abi.encodeWithSelector(
                _action.actionConditionsOk.selector,
                _actionPayloadWithSelector
            );
            (bool success,
             bytes memory returndata) = address(_action).staticcall.gas(canExecMaxGas / 2)(
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
}