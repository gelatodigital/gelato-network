pragma solidity ^0.6.6;

interface IGelatoExecutors {
    event LogStakeExecutor(address indexed executor, uint256 stake);
    event LogUnstakeExecutor(
        address indexed executor);
    event LogIncreaseExecutorStake(address indexed executor, uint256 newStake);

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    /// @notice Stake on Gelato to become a whitelisted executor
    /// @dev Msg.value has to be >= minExecutorStake
    function stakeExecutor() external payable;

    /// @notice Unstake on Gelato to become de-whitelisted and withdraw minExecutorStake
    function unstakeExecutor() external;

    /// @notice Increase your executor stake balance
    /// @dev Msg.value has to be >= minExecutorStake
    function increaseExecutorStake() external payable;

    /// @notice Re-assigns multiple providers to other executors
    /// @dev Executors must re-assign all providers before being able to unstake
    /// @param _providers List of providers to re-assign
    /// @param _newExecutor Address of new executor to assign providers to
    function multiReassignProviders(
        address[] calldata _providers,
        address _newExecutor
    ) external;


    /// @notice Withdraw excess Execur Stake
    /// @dev Can only be called if executor is isExecutorMinStaked
    /// @param _withdrawAmount Amount to withdraw
    /// @return Amount that was actually withdrawn
    function withdrawExcessExecutorStake(uint256 _withdrawAmount) external returns(uint256);

}
