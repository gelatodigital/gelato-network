pragma solidity ^0.6.4;

import "./interfaces/IGelatoExecutors.sol";
import "../external/Address.sol";
import "../external/SafeMath.sol";

abstract contract GelatoExecutors is IGelatoExecutors {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    // Executor Registration/Lifespan mgmt
    mapping(address => uint256) public override executorClaimLifespan;

    // Executor Accounting
    mapping(address => uint256) public override executorSuccessFeeFactor;
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
    function registerExecutor(
        uint256 _executorClaimLifespan,
        uint256 _executorSuccessFeeFactor
    )
        external
        override
        minMaxExecutorClaimLifespan(_executorClaimLifespan)
    {
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        executorSuccessFeeFactor[msg.sender] = _executorSuccessFeeFactor;
        emit LogRegisterExecutor(
            msg.sender,
            _executorClaimLifespan,
            _executorSuccessFeeFactor
        );
    }

    function deregisterExecutor() external override {
        _requireRegisteredExecutor(msg.sender);
        delete executorClaimLifespan[msg.sender];
        delete executorSuccessFeeFactor[msg.sender];
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
    function setExecutorFeeFactor(uint256 _feeFactor) external override {
        require(_feeFactor < 100, "GelatoExecutors.setExecutorFeeFactor: over 100");
        emit LogSetExecutorFeeFactor(
            msg.sender,
            executorSuccessFeeFactor[msg.sender],
            _feeFactor
        );
        executorSuccessFeeFactor[msg.sender] = _feeFactor;
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

    function executorSuccessFee(address _executor, uint256 _gas, uint256 _gasPrice)
        external
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(executorSuccessFeeFactor[_executor]),
            100,
            "GelatoExecutors.executorSuccessFee: div error"
        );
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