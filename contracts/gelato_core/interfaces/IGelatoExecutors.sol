pragma solidity ^0.6.4;

interface IGelatoExecutors {
    event LogRegisterExecutor(
        address indexed executor,
        uint256 executorClaimLifespan,
        uint256 executorSuccessShare
    );
    event LogDeregisterExecutor(address indexed executor);



    event LogSetExecutorSuccessShare(
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
        uint256 _executorSuccessShare
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
    function setExecutorSuccessShare(uint256 _percentage) external;
    function withdrawExecutorBalance(uint256 _withdrawAmount) external;
    function executorSuccessShare(address _executor) external view returns (uint256);
    function executorSuccessFee(address _executor, uint256 _gas, uint256 _gasPrice)
        external
        view
        returns (uint256);
    function executorFunds(address _executor) external view returns (uint256);
}
