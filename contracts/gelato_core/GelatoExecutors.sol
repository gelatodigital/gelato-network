pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoExecutors } from "./interfaces/IGelatoExecutors.sol";
import { GelatoProviders } from "./GelatoProviders.sol";
import { Address } from  "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";

/// @title GelatoExecutors
/// @author Luis Schliesske & Hilmar Orth
/// @notice Stake Management of executors & batch Unproving providers
/// @dev Find all NatSpecs inside IGelatoExecutors
abstract contract GelatoExecutors is IGelatoExecutors, GelatoProviders {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    // Executor De/Registrations and Staking
    function stakeExecutor() external payable override {
        require(
            executorStake[msg.sender] == 0,
            "GelatoExecutors.stakeExecutor: already registered"
        );
        require(
            msg.value >= minExecutorStake,
            "GelatoExecutors.stakeExecutor: minExecutorStake"
        );
        executorStake[msg.sender] = msg.value;
        emit LogStakeExecutor(msg.sender, msg.value);
    }

    function unstakeExecutor() external override {
        require(
            !isExecutorAssigned(msg.sender),
            "GelatoExecutors.unstakeExecutor: msg.sender still assigned"
        );
        uint256 unbondedStake = executorStake[msg.sender];
        require(
            unbondedStake != 0,
            "GelatoExecutors.unstakeExecutor: already unstaked"
        );
        delete executorStake[msg.sender];
        msg.sender.sendValue(unbondedStake);
        emit LogUnstakeExecutor(msg.sender);
    }

    function increaseExecutorStake() external payable override {
        uint256 currentStake = executorStake[msg.sender];
        require(currentStake != 0, "GelatoExecutors.increaseExecutorStake: no stake");
        uint256 newStake = currentStake + msg.value;
        executorStake[msg.sender] = newStake;
        require(
            newStake >= minExecutorStake,
            "GelatoExecutors.increaseExecutorStake: below minStake"
        );
        emit LogIncreaseExecutorStake(msg.sender, newStake);
    }

    function withdrawExcessExecutorStake(uint256 _withdrawAmount)
        external
        override
        returns(uint256 realWithdrawAmount)
    {
        require(
            isExecutorMinStaked(msg.sender),
            "GelatoExecutors.withdrawExcessExecutorStake: not minStaked"
        );

        uint256 currentExecutorStake = executorStake[msg.sender];
        uint256 excessExecutorStake = currentExecutorStake - minExecutorStake;

        realWithdrawAmount = Math.min(_withdrawAmount, excessExecutorStake);

        uint256 newExecutorStake = currentExecutorStake - realWithdrawAmount;

        // Effects
        executorStake[msg.sender] = newExecutorStake;

        // Interaction
        msg.sender.sendValue(realWithdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, realWithdrawAmount);
    }

    // To unstake, Executors must reassign ALL their Providers to another staked Executor
    function multiReassignProviders(address[] calldata _providers, address _newExecutor)
        external
        override
    {
        for (uint i; i < _providers.length; i++)
            executorAssignsExecutor(_providers[i], _newExecutor);
    }
}