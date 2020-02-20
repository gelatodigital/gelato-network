pragma solidity ^0.6.2;

import "./interfaces/IGelatoExecutor.sol";
import "../external/Address.sol";

abstract contract GelatoExecutor is IGelatoExecutor {

    using Address for address payable;  /// for sendValue method

    // Executor Registration/Lifespan mgmt
    mapping(address => uint256) public override executorClaimLifespan;

    // Executor Accounting
    mapping(address => uint256) public override executorBalance;

    modifier onlyRegisteredExecutors(address _executor) {
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoExecutor.onlyRegisteredExecutors: failed"
        );
        _;
    }

    // Executor De/Registrations
    function registerExecutor(uint256 _executorClaimLifespan) external override {
        require(
            _executorClaimLifespan > 0,
            "GelatoExecutor.registerExecutor: 0 _executorClaimLifespan disallowed"
        );
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        emit LogRegisterExecutor(msg.sender, _executorClaimLifespan);
    }

    function deregisterExecutor()
        external
        override
        onlyRegisteredExecutors(msg.sender)
    {
        executorClaimLifespan[msg.sender] = 0;
        emit LogDeregisterExecutor(msg.sender);
    }

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external
        override
    {
        require(
            _newExecutorClaimLifespan > 0,
            "GelatoExecutor.setExecutorClaimLifespan: 0 disallowed"
        );
        emit LogSetExecutorClaimLifespan(
            executorClaimLifespan[msg.sender],
            _newExecutorClaimLifespan
        );
        executorClaimLifespan[msg.sender] = _newExecutorClaimLifespan;
    }

    // Executor Accounting
    function withdrawExecutorBalance(uint256 _withdrawAmount) external override {
        // Checks
        require(
            _withdrawAmount > 0,
            "GelatoExecutor.withdrawExecutorBalance: zero _withdrawAmount"
        );
        uint256 currentExecutorBalance = executorBalance[msg.sender];
        require(
            currentExecutorBalance > _withdrawAmount,
            "GelatoExecutor.withdrawExecutorBalance: out of balance"
        );
        // Effects
        executorBalance[msg.sender] = currentExecutorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, _withdrawAmount);
    }
}