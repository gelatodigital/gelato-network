pragma solidity ^0.6.2;

import "./interfaces/IGelatoExecutor.sol";
import "../external/Address.sol";

abstract contract GelatoExecutor is IGelatoExecutor {

    using Address for address payable;  /// for sendValue method

    // Executor Registration/Lifespan mgmt
    mapping(address => uint256) public override executorClaimLifespan;

    // Executor Accounting
    mapping(address => uint256) public override executorBalance;

    modifier minMaxExecutorClaimLifespan(uint256 _executorClaimLifespan) {
        require(
            _executorClaimLifespan > 20 seconds &&
            _executorClaimLifespan < 1000 days,
            "GelatoExecutor.minMaxExecutorClaimLifespan"
        );
        _;
    }

    modifier maxExecutionClaimLifespan(address _executor, uint256 _expiryDate) {
        require(
            _expiryDate <= now + executorClaimLifespan[_executor],
            "GelatoExecutor.maxExecutionClaimLifespan"
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
        _registeredExecutor(msg.sender);
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

    function _registeredExecutor(address _executor) internal view{
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoExecutor.registeredExecutor"
        );
    }
}