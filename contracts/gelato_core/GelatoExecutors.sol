pragma solidity ^0.6.4;

import "./interfaces/IGelatoExecutors.sol";
import "../external/Address.sol";
import "../external/SafeMath.sol";

abstract contract GelatoExecutors is IGelatoExecutors {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    // Executor Accounting
    mapping(address => uint256) public override executorSuccessShare;
    mapping(address => uint256) public override executorFunds;

    modifier minMaxExecutorClaimLifespan(uint256 _executorClaimLifespan) {
        require(
            _executorClaimLifespan > 20 seconds &&
            _executorClaimLifespan < 36500 days,  // ~ 100 years
            "GelatoExecutors.minMaxExecutorClaimLifespan"
        );
        _;
    }

    // Executor De/Registrations
    function registerExecutor(uint256 _executorClaimLifespan, uint256 _executorSuccessShare)
        external
        override
        minMaxExecutorClaimLifespan(_executorClaimLifespan)
    {
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        executorSuccessShare[msg.sender] = _executorSuccessShare;
        emit LogRegisterExecutor(
            msg.sender,
            _executorClaimLifespan,
            _executorSuccessShare
        );
    }

    function deregisterExecutor() external override {
        _requireRegisteredExecutor(msg.sender);
        delete executorClaimLifespan[msg.sender];
        delete executorSuccessShare[msg.sender];
        emit LogDeregisterExecutor(msg.sender);
    }

    function setExecutorClaimLifespan(uint256 _lifespan)
        external
        override
        minMaxExecutorClaimLifespan(_lifespan)
    {
        emit LogSetExecutorClaimLifespan(executorClaimLifespan[msg.sender], _lifespan);
        executorClaimLifespan[msg.sender] = _lifespan;
    }

    // Executor Accounting
    function setExecutorSuccessShare(uint256 _percentage) external override {
        require(_percentage < 100, "GelatoExecutors.setExecutorSuccessShare: over 100");
        emit LogSetExecutorSuccessShare(
            msg.sender,
            executorSuccessShare[msg.sender],
            _percentage
        );
        executorSuccessShare[msg.sender] = _percentage;
    }

    function executorSuccessFee(address _executor, uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(executorSuccessShare[_executor]),
            100,
            "GelatoExecutors.executorSuccessFee: div error"
        );
    }

    function withdrawExecutorBalance(uint256 _withdrawAmount) external override {
        // Checks
        require(
            _withdrawAmount > 0,
            "GelatoExecutors.withdrawExecutorBalance: zero _withdrawAmount"
        );
        uint256 currentExecutorBalance = executorFunds[msg.sender];
        require(
            currentExecutorBalance >= _withdrawAmount,
            "GelatoExecutors.withdrawExecutorBalance: out of balance"
        );
        // Effects
        executorFunds[msg.sender] = currentExecutorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, _withdrawAmount);
    }

    // Check functions (not modifiers due to stack too deep)
    function _requireRegisteredExecutor(address _executor) internal view {
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoExecutors._requireRegisteredExecutor"
        );
    }

    function _requireMaxExecutorClaimLifespan(address _executor, uint256 _execClaimExpiryDate)
        internal
        view
    {
        require(
            _execClaimExpiryDate <= now + executorClaimLifespan[_executor],
            "GelatoExecutors._requireMaxExecutorClaimLifespan"
        );
    }
}