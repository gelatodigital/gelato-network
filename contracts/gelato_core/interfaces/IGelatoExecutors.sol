pragma solidity ^0.6.4;

interface IGelatoExecutors {
    event LogStakeExecutor(address indexed executor, uint256 stake);
    event LogUnstakeExecutor(
        address indexed executor,
        address indexed transferExecutor
    );
    event LogIncreaseExecutorStake(address indexed executor, uint256 newStake);

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    function stakeExecutor() external payable;
    function unstakeExecutor(address _transferExecutor) external;
    function increaseExecutorStake(uint256 _topUpAmount) external payable;

    function batchReassignProviders(
        address[] calldata _providers,
        address _transferExecutor
    ) external;

    function withdrawExecutorBalance(uint256 _withdrawAmount) external returns(uint256);

    function executorStake(address _executor) external view returns (uint256);
    function isExecutorMinStaked(address _executor) external view returns(bool);

    function executorFunds(address _executor) external view returns (uint256);
}