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
    mapping(address => uint256) public override sponsorBalance;

    // Gelato Executor Economics
    mapping(address => uint256) public override executorClaimLifespan;
    mapping(address => uint256) public override executorBalance;

    // ===== Protocol Admin ======
    function setAdminGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetAdminGasPrice(adminGasPrice, _newGasPrice, msg.sender);
        adminGasPrice = _newGasPrice;
    }

    // Sponsor Economics
    function addSponsorBalance(uint256 _amount) external override {
        uint256 currentSponsorBalance = sponsorBalance[msg.sender];
        sponsorBalance[msg.sender] = currentSponsorBalance.add(_amount);
        emit LogAddSponsorBalance(
            msg.sender,
            currentSponsorBalance,
            sponsorBalance[msg.sender]
        );
    }

    function withdrawSponsorBalance(uint256 _withdrawAmount)
        external
        override
    {
        // Checks
        uint256 currentSponsorBalance = sponsorBalance[msg.sender];
        require(
            _withdrawAmount > 0,
            "GelatoCoreAccounting.withdrawManagerBalance: zero _withdrawAmount"
        );
        require(
            currentSponsorBalance > _withdrawAmount,
            "GelatoCoreAccounting.withdrawManagerBalance: zero balance"
        );
        // Effects
        sponsorBalance[msg.sender] = currentSponsorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawSponsorBalance(
            msg.sender,
            currentSponsorBalance,
            sponsorBalance[msg.sender]
        );
    }

    modifier onlyStakedSponsors(address _sponsor) {
        require(
            sponsorBalance[_sponsor] != 0,
            "GelatoCoreAccounting.onlyStakedSponsors: failed"
        );
        _;
    }

    // Executor De/Registrations
    function registerExecutor(uint256 _executorClaimLifespan) external override {
        require(
            _executorClaimLifespan > 0,
            "GelatoCoreAccounting.registerExecutor: 0 _executorClaimLifespan disallowed"
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
            "GelatoCoreAccounting.setExecutorClaimLifespan: 0 disallowed"
        );
        emit LogSetExecutorClaimLifespan(
            executorClaimLifespan[msg.sender],
            _newExecutorClaimLifespan
        );
        executorClaimLifespan[msg.sender] = _newExecutorClaimLifespan;
    }

    // Executor Economics
    function withdrawExecutorBalance(uint256 _withdrawAmount) external override {
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