pragma solidity ^0.6.4;

interface IGelatoExecutors {
    event LogRegisterExecutor(
        address indexed executor,
        uint256 executorClaimLifespan,
        uint256 executorSuccessFeeFactor
    );
    event LogDeregisterExecutor(address indexed executor);

    event LogSetExecutorClaimLifespan(uint256 oldLifespan, uint256 newLifespan);

    event LogSetExecutorFeeFactor(
        address indexed executor,
        uint256 oldFactor,
        uint256 newFactor
    );
    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    // Executor Registration
    function registerExecutor(
        uint256 _executorClaimLifespan,
        uint256 _executorFeeFactor
    ) external;
    function deregisterExecutor() external;

    // Executors' Claim Lifespan management
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external;
    function executorClaimLifespan(address _executor)
        external
        view
        returns (uint256);

    // Executor Accounting
    function setExecutorFeeFactor(uint256 _feeFactor) external;
    function withdrawExecutorBalance(uint256 _withdrawAmount) external;
    function executorSuccessFeeFactor(address _executor) external view returns (uint256);
    function executorSuccessFee(address _executor, uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);
    function executorFunds(address _executor) external view returns (uint256);
}
