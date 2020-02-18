pragma solidity ^0.6.2;

import "./interfaces/IGelatoCoreAccounting.sol";
import "../external/Ownable.sol";
import "../external/Address.sol";
import "../external/SafeMath.sol";

/// @title GelatoCoreAccounting
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoCoreAccounting is IGelatoCoreAccounting, Ownable {

    using Address for address payable;  /// for oz's sendValue method
    using SafeMath for uint256;

    // ===== Protocol Admin ======
    uint256 public override adminGasPrice = 9000000000;  // 9 gwei

    // Gelato Manager Economics
    mapping(address => uint256) public override benefactorBalance;

    // Gelato Executor Economics
    mapping(address => uint256) public override executorClaimLifespan;
    mapping(address => uint256) public override executorBalance;

    // ===== Protocol Admin ======
    function setAdminGasPrice(uint256 _newGasPrice) external onlyOwner {
        emit LogSetAdminGasPrice(adminGasPrice, _newGasPrice, msg.sender);
        adminGasPrice = _gasPrice;
    }

    // Benefactor Economics
    function addBenefactorBalance(uint256 _amount) external override {
        uint256 currentBenefactorBalance = benefactorBalance[msg.sender];
        benefactorBalance[msg.sender] = currentBenefactorBalance.add(_amount);
        emit LogAddBenefactorBalance(
            msg.sender,
            currentBenefactorBalance,
            benefactorBalance[msg.sender]
        );
    }

    function withdrawBenefactorBalance(uint256 _withdrawAmount)
        external
        override
    {
        // Checks
        uint256 currentBenefactorBalance = benefactorBalance[msg.sender];
        require(
            _withdrawAmount > 0,
            "GelatoCoreAccounting.withdrawManagerBalance: zero _withdrawAmount"
        );
        require(
            currentBenefactorBalance > _withdrawAmount,
            "GelatoCoreAccounting.withdrawManagerBalance: zero balance"
        );
        // Effects
        benefactorBalance[msg.sender] = currentBenefactorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawBenefactorBalance(
            msg.sender,
            currentBenefactorBalance,
            benefactorBalance[msg.sender]
        );
    }

    modifier onlyStakedBenefactors(address _benefactor) {
        require(
            benefactorBalance[_benefactor] != 0,
            "GelatoCoreAccounting.onlyStakedBenefactors: failed"
        );
        _;
    }

    // Executor De/Registrations
    function registerExecutor(uint256 _executorClaimLifespan) external override {
        require(
            _executorClaimLifespan >= minExecutionClaimLifespan,
            "GelatoCoreAccounting.registerExecutor: _executorClaimLifespan cannot be 0"
        );
        executorClaimLifespan[msg.sender] = _executorClaimLifespan;
        emit LogRegisterExecutor(msg.sender, _executorClaimLifespan);
    }

    modifier onlyRegisteredExecutors(address _executor) {
        require(
            executorClaimLifespan[_executor] != 0,
            "GelatoCoreAccounting.onlyRegisteredExecutors: failed"
        );
        _;
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
            "GelatoCoreAccounting.setExecutorClaimLifespan: failed"
        );
        emit LogSetExecutorClaimLifespan(
            executorClaimLifespan[msg.sender],
            _newExecutorClaimLifespan
        );
        executorClaimLifespan[msg.sender] = _newExecutorClaimLifespan;
    }

    // Executor Economics
    function withdrawExecutorBalance(_withdrawAmount) external override {
        // Checks
        uint256 currentExecutorBalance = executorBalance[msg.sender];
        require(
            _withdrawAmount > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: zero _withdrawAmount"
        );
        require(
            currentExecutorBalance > _withdrawAmount,
            "GelatoCoreAccounting.withdrawExecutorBalance: zero balance"
        );
        // Effects
        executorBalance[msg.sender] = currentExecutorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, _withdrawAmount);
    }
}