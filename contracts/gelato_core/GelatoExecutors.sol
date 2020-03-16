pragma solidity ^0.6.4;

import "./interfaces/IGelatoExecutors.sol";
import "../external/Address.sol";

abstract contract GelatoExecutors is IGelatoExecutors {

    using Address for address payable;  /// for sendValue method

    // Executor Registration/Lifespan mgmt
    mapping(address => uint256) public override executorClaimLifespan;

    // Executor Accounting
    mapping(address => uint256) public override executorBalance;

    modifier minMaxExecutorClaimLifespan(uint256 _executorClaimLifespan) {
        require(
            _executorClaimLifespan > 20 seconds &&
            _executorClaimLifespan < 1000 days,
            "GelatoExecutors.minMaxExecutorClaimLifespan"
        );
        _;
    }

    // Executor De/Registrations
    function registerExecutor(uint256 _executorClaimLifespan)
        external
        override
        minMaxExecutorClaimLifespan(_executorClaimLifespan)
    {
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        emit LogRegisterExecutor(msg.sender, _executorClaimLifespan);
    }

    function deregisterExecutor()
        external
        override
    {
        _requireRegisteredExecutor(msg.sender);
        executorClaimLifespan[msg.sender] = 0;
        emit LogDeregisterExecutor(msg.sender);
    }

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan)
        external
        override
        minMaxExecutorClaimLifespan(_newExecutorClaimLifespan)
    {
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
            "GelatoExecutors.withdrawExecutorBalance: zero _withdrawAmount"
        );
        uint256 currentExecutorBalance = executorBalance[msg.sender];
        require(
            currentExecutorBalance >= _withdrawAmount,
            "GelatoExecutors.withdrawExecutorBalance: out of balance"
        );
        // Effects
        executorBalance[msg.sender] = currentExecutorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, _withdrawAmount);
    }


    // Check functions (not modifiers due to stack too deep)
    function _requireRegisteredExecutor(address _executor) internal view {
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoExecutors._registeredExecutor"
        );
    }

    function _requireExecutionClaimLifespan(
        address _executor,
        uint256 _executionClaimExpiryDate
    )
        internal
        view
    {
        require(
            _executionClaimExpiryDate <= now + executorClaimLifespan[_executor],
            "GelatoExecutors._maxExecutionClaimLifespan"
        );
    }
}