pragma solidity ^0.6.2;

interface IGelatoExecutor {

    event LogRegisterExecutor(address indexed executor, uint256 executorClaimLifespan);
    event LogDeregisterExecutor(address indexed executor);

    event LogSetExecutorClaimLifespan(uint256 previousLifespan, uint256 newLifespan);

    event LogWithdrawExecutorBalance(address indexed executor, uint256 withdrawAmount);

    // Executor Registration
    function registerExecutor(uint256 _executorClaimLifespan) external;
    function deregisterExecutor() external;

    // Executors' Claim Lifespan management
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;
    function executorClaimLifespan(address _executor) external view returns(uint256);

    // Executor Accounting
    function withdrawExecutorBalance(uint256 _withdrawAmount) external;
    function executorBalance(address _executor) external view returns(uint256);
}