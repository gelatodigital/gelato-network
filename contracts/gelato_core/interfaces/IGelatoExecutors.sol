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

    function stakeExecutor() external payable;
    function unstakeExecutor() external;
    function increaseExecutorStake(uint256 _topUpAmount) external payable;

    function batchReassignProviders(
        address[] calldata _providers,
        address _transferExecutor
    ) external;

    function withdrawExcessExecutorStake(uint256 _withdrawAmount) external returns(uint256);
}
