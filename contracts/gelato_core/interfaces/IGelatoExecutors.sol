// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IGelatoExecutors {
    event LogExecutorStaked(address indexed executor, uint256 oldStake, uint256 newStake);
    event LogExecutorUnstaked(address indexed executor);

    event LogExecutorBalanceWithdrawn(
        address indexed executor,
        uint256 withdrawAmount
    );

    /// @notice Stake on Gelato to become a whitelisted executor
    /// @dev Msg.value has to be >= minExecutorStake
    function stakeExecutor() external payable;

    /// @notice Unstake on Gelato to become de-whitelisted and withdraw minExecutorStake
    function unstakeExecutor() external;

    /// @notice Re-assigns multiple providers to other executors
    /// @dev Executors must re-assign all providers before being able to unstake
    /// @param _providers List of providers to re-assign
    /// @param _newExecutor Address of new executor to assign providers to
    function multiReassignProviders(address[] calldata _providers, address _newExecutor)
        external;


    /// @notice Withdraw excess Execur Stake
    /// @dev Can only be called if executor is isExecutorMinStaked
    /// @param _withdrawAmount Amount to withdraw
    /// @return Amount that was actually withdrawn
    function withdrawExcessExecutorStake(uint256 _withdrawAmount) external returns(uint256);

}
