// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoCore, Provider, Task} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {IGelatoProviders, TaskSpec} from "../../../gelato_core/interfaces/IGelatoProviders.sol";
import {IGelatoProviderModule} from "../../../gelato_provider_modules/IGelatoProviderModule.sol";

contract ActionSubmitTask {

    IGelatoCore public immutable gelatoCore;

    constructor(address _gelatoCore) public {
        gelatoCore = IGelatoCore(_gelatoCore);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTask(Provider memory _provider, Task memory _task, uint256 _expiryDate)
        public
        payable
    {
        gelatoCore.submitTask(_provider, _task, _expiryDate);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskAndMultiProvide(
        Provider memory _provider,
        Task memory _task,
        uint256 _expiryDate,
        address _executor,
        IGelatoProviderModule[] memory _providerModules,
        uint256 _ethToDeposit
    )
        public
        payable
    {
        gelatoCore.submitTask(_provider, _task, _expiryDate);
        TaskSpec[] memory taskSpecs = new TaskSpec[](0);
        IGelatoProviders(address(gelatoCore)).multiProvide{value: _ethToDeposit}(
            _executor,
            taskSpecs,
            _providerModules
        );
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskCycle(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
        payable
    {
        gelatoCore.submitTaskCycle(_provider, _tasks, _expiryDate, _cycles);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskCycleAndMultiProvide(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles,
        address _executor,
        IGelatoProviderModule[] memory _providerModules,
        uint256 _ethToDeposit
    )
        public
        payable
    {
        gelatoCore.submitTaskCycle(_provider, _tasks, _expiryDate, _cycles);
        TaskSpec[] memory taskSpecs = new TaskSpec[](0);
        IGelatoProviders(address(gelatoCore)).multiProvide{value: _ethToDeposit}(
            _executor,
            taskSpecs,
            _providerModules
        );
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskChain(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    )
        public
        payable
    {
        gelatoCore.submitTaskChain(_provider, _tasks, _expiryDate, _sumOfRequestedTaskSubmits);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskChainAndMultiProvide(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits,
        address _executor,
        IGelatoProviderModule[] memory _providerModules,
        uint256 _ethToDeposit
    )
        public
        payable
    {
        gelatoCore.submitTaskChain(_provider, _tasks, _expiryDate, _sumOfRequestedTaskSubmits);
        TaskSpec[] memory taskSpecs = new TaskSpec[](0);
        IGelatoProviders(address(gelatoCore)).multiProvide{value: _ethToDeposit}(
            _executor,
            taskSpecs,
            _providerModules
        );
    }
}
