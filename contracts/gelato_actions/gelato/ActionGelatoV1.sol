// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoCore, TaskReceipt, Task, Provider, Action, Condition, IGelatoProviderModule} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {TaskSpec, IGelatoProviders} from "../../gelato_core/interfaces/IGelatoProviders.sol";
import {GelatoActionsStandard} from "../GelatoActionsStandardFull.sol";
import {Address} from "../../external/Address.sol";


/// @title ActionGelatoV1
/// @author Hilmar Orth
/// @notice Gelato Action that
contract ActionGelatoV1 is GelatoActionsStandard {

    using Address for address payable;
    address constant GELATO_CORE = 0x025030BdAa159f281cAe63873E68313a703725A5;

    // ===== Gelato ENTRY APIs ======

    /**
     * @dev Enables first time users to  pre-fund eth, whitelist an executor & register the
     * ProviderModuleDSA.sol to be able to use Gelato
     * @param _executor address of single execot node or gelato'S decentralized execution market
     * @param _taskSpecs enables external providers to whitelist TaskSpecs on gelato
     * @param _modules address of ProviderModuleDSA
     * @param _ethToDeposit amount of eth to deposit on Gelato, only for self-providers
     */
    function multiProvide(
        address _executor,
        TaskSpec[] calldata _taskSpecs,
        IGelatoProviderModule[] calldata _modules,
        uint256 _ethToDeposit
    ) external payable {
        uint256 ethToDeposit = _ethToDeposit == uint256(-1)
            ? address(this).balance
            : _ethToDeposit;

        IGelatoProviders(GELATO_CORE).multiProvide{value: ethToDeposit}(
            _executor,
            _taskSpecs,
            _modules
        );
    }

    /**
     * @dev Deposit Funds on Gelato to a given address
     * @param _provider address of balance to top up on Gelato
     * @param _ethToDeposit amount of eth to deposit on Gelato
     */
    function provideFunds(
        address _provider,
        uint256 _ethToDeposit
    ) external payable {
        uint256 ethToDeposit = _ethToDeposit == uint256(-1)
            ? address(this).balance
            : _ethToDeposit;

        IGelatoProviders(GELATO_CORE).provideFunds{value: ethToDeposit}(
            _provider
        );
    }

    /**
     * @dev Withdraw funds previously deposited on Gelato
     * @param _ethToWithdraw amount of eth to withdraw from Gelato
     */
    function unprovideFunds(
        uint256 _ethToWithdraw,
        address payable _receiver
    ) external payable {
        uint256 withdrawAmount = IGelatoProviders(GELATO_CORE).unprovideFunds(
            _ethToWithdraw
        );
        if (_receiver != address(0) && _receiver != address(this))
            _receiver.sendValue(withdrawAmount);
    }

    /**
     * @dev Submits a single, one-time task to Gelato
     * @param _provider Consists of proxy module address (DSA) and provider address ()
     * who will pay for the transaction execution
     * @param _task Task specifying the condition and the action connectors
     * @param _expiryDate Default 0, othweise timestamp after which the task expires
     */
    function submitTask(
        Provider calldata _provider,
        Task calldata _task,
        uint256 _expiryDate
    ) external {
        IGelatoCore(GELATO_CORE).submitTask(_provider, _task, _expiryDate);
    }

    /**
     * @dev Submits single or mulitple Task Sequences to Gelato
     * @param _provider Consists of proxy module address (DSA) and provider address ()
     * who will pay for the transaction execution
     * @param _tasks A sequence of Tasks, can be a single or multiples
     * @param _expiryDate Default 0, othweise timestamp after which the task expires
     * @param _cycles How often the Task List should be executed, e.g. 5 times
     */
    function submitTaskCycle(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    ) external {
        IGelatoCore(GELATO_CORE).submitTaskCycle(
            _provider,
            _tasks,
            _expiryDate,
            _cycles
        );
    }

    /**
     * @dev Submits single or mulitple Task Chains to Gelato
     * @param _provider Consists of proxy module address (DSA) and provider address ()
     * who will pay for the transaction execution
     * @param _tasks A sequence of Tasks, can be a single or multiples
     * @param _expiryDate Default 0, othweise timestamp after which the task expires
     * @param _sumOfRequestedTaskSubmits The TOTAL number of Task auto-submits
     * that should have occured once the cycle is complete
     */
    function submitTaskChain(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    ) external {
        IGelatoCore(GELATO_CORE).submitTaskChain(
            _provider,
            _tasks,
            _expiryDate,
            _sumOfRequestedTaskSubmits
        );
    }

    // ===== Gelato EXIT APIs ======

    /**
     * @dev Withdraws funds from Gelato, de-whitelists TaskSpecs and Provider Modules
     * in one tx
     * @param _withdrawAmount Amount of ETH to withdraw from Gelato
     * @param _taskSpecs List of Task Specs to de-whitelist, default empty []
     * @param _modules List of Provider Modules to de-whitelist, default empty []
     */
    function multiUnprovide(
        uint256 _withdrawAmount,
        TaskSpec[] calldata _taskSpecs,
        IGelatoProviderModule[] calldata _modules
    ) external {

        IGelatoProviders(GELATO_CORE).multiUnprovide(
            _withdrawAmount,
            _taskSpecs,
            _modules
        );
    }

    /**
     * @dev Cancels outstanding Tasks
     * @param _taskReceipts List of Task Receipts to cancel
     */
    function multiCancelTasks(TaskReceipt[] calldata _taskReceipts)
        external
    {
        IGelatoCore(GELATO_CORE).multiCancelTasks(_taskReceipts);
    }
}