pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract GelatoCoreAccounting is Ownable,
                                 ReentrancyGuard
{
    using SafeMath for uint256;

    // to make clear that this is not a standalone-deployment contract
    constructor() internal {}

    // Fallback Function
    function() external payable {
        require(isOwner(),
            "GelatoCore.fallback: only owner should send ether without fnSelector."
        );
    }

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) internal gtaiBalances;
    mapping(address => uint256) internal gtaiExecutionClaimsCounter;
    mapping(address => uint256) internal executorBalances;
    uint256 internal minStakePerExecutionClaim;
    uint256 internal executorProfit;
    uint256 internal executorGasPrice;
    //_____________ Constant gas values _____________
    uint256 internal gasOutsideGasleftChecks;
    uint256 internal gasInsideGasleftChecks;
    uint256 internal canExecMaxGas;
    uint256 internal executorGasRefundEstimate;
    uint256 internal cancelIncentive;
    // =========================

    // _______ GTAIBalance Checks ___________________________________________
    function _GTAIBalanceRequirement(address _GTAI)
        internal
        view
        returns(uint256 gtaiBalanceRequirement)
    {
        gtaiBalanceRequirement
            = minStakePerExecutionClaim.mul(gtaiExecutionClaimsCounter[_GTAI]);
    }
    function _gtaiHasSufficientBalance(address _GTAI)
        internal
        view
        returns(bool)
    {
        return gtaiBalances[_GTAI] >= _GTAIBalanceRequirement(_GTAI);
    }
    modifier gtaiBalanceOk() {
        require(_gtaiHasSufficientBalance(msg.sender),
            "GelatoCoreAccounting.gtaiBalanceOk: fail"
        );
        _;
    }
    // =========================


    // __________ Interface for State Reads ___________________________________
    function getGTAIBalance(address _gtai) external view returns(uint256) {
        return gtaiBalances[_gtai];
    }
    function getGTAIExecutionClaimsCounter(address _gtai) external view returns(uint256) {
        return gtaiExecutionClaimsCounter[_gtai];
    }
    function getExecutorBalance(address _executor) external view returns(uint256) {
        return executorBalances[_executor];
    }
    function getMinStakePerExecutonClaim() external view returns(uint256) {
        return minStakePerExecutionClaim;
    }
    function getExecutorProfit() external view returns(uint256) {
        return executorProfit;
    }
    function getExecutorGasPrice() external view returns(uint256) {
        return executorGasPrice;
    }
    function getGasOutsideGasleftChecks() external view returns(uint256) {
        return gasOutsideGasleftChecks;
    }
    function getGasInsideGasleftChecks() external view returns(uint256) {
        return gasInsideGasleftChecks;
    }
    function getCanExecMaxGas() external view returns(uint256) {
        return canExecMaxGas;
    }
    function getExecutorGasRefundEstimate() external view returns(uint256) {
        return executorGasRefundEstimate;
    }
    function getCancelIncentive() external view returns(uint256) {
        return cancelIncentive;
    }
    function getGTAIBalanceRequirement(address _GTAI)
        external
        view
        returns(uint256)
    {
        return _GTAIBalanceRequirement(_GTAI);
    }
    function sufficientBalanceCheck(address _GTAI)
        external
        view
        returns(bool)
    {
        return gtaiBalances[_GTAI] >= _GTAIBalanceRequirement(_GTAI);
    }
    // =========================

    // ____________ Interface for STATE MUTATIONS ________________________________________
    //_____________ Interface for GTAIs  __________
    event LogGTAIBalanceAdded(address indexed GTAI,
                              uint256 oldBalance,
                              uint256 addedAmount,
                              uint256 newBalance
    );
    function addGTAIBalance()
        external
        payable
    {
        require(msg.value > 0,
            "GelatoCoreAccounting.addGTAIBalance(): zero-value"
        );
        uint256 currentBalance = gtaiBalances[msg.sender];
        uint256 newBalance = currentBalance.add(msg.value);
        gtaiBalances[msg.sender] = newBalance;
        emit LogGTAIBalanceAdded(msg.sender,
                                 currentBalance,
                                 msg.value,
                                 newBalance
        );
    }

    function _withdrawAmountOk(address _GTAI,
                               uint256 _withdrawAmount
    )
        internal
        view
        returns(bool, uint256 currentGTAIBalance)
    {
        uint256 gtaiBalanceRequirement = getGTAIBalanceRequirement(_GTAI);
        currentGTAIBalance = gtaiBalances[_GTAI];
        return (currentGTAIBalance.sub(_withdrawAmount) >= gtaiBalanceRequirement,
                currentGTAIBalance
        );
    }
    event LogGTAIBalanceWithdrawal(address indexed GTAI,
                                   uint256 oldBalance,
                                   uint256 withdrawnAmount,
                                   uint256 newBalance
    );
    function withdrawGTAIBalance(uint256 _withdrawAmount)
        nonReentrant
        external
    {
        require(_withdrawAmount > 0,
            "GelatoCoreAccounting.withdrawGTAIBalance(): zero-value"
        );
        (bool withdrawAmountOk,
         uint256 currentGTAIBalance) = _withdrawAmountOk(msg.sender, _withdrawAmount);
        require(withdrawAmountOk,
            "GelatoCoreAccounting.withdrawGTAIBalance: withdrawAmountOk failed"
        );
        // Checks: withdrawAmountOk(_withdrawAmount)
        // Effects
        gtaiBalances[msg.sender] = currentGTAIBalance.sub(_withdrawAmount);
        // Interaction
        msg.sender.transfer(_withdrawAmount);
        emit LogGTAIBalanceWithdrawal(msg.sender,
                                      currentGTAIBalance,
                                      _withdrawAmount,
                                      gtaiBalances[msg.sender]
        );
    }
    // =========

    //_____________ Interface for Executor __________
    event LogExecutorBalanceWithdrawal(address indexed executor,
                                       uint256 withdrawAmount
    );
    function withdrawExecutorBalance()
        nonReentrant
        external
    {
        // Checks
        uint256 currentExecutorBalance = executorBalances[msg.sender];
        require(currentExecutorBalance > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: failed"
        );
        // Effects
        executorBalances[msg.sender] = 0;
        // Interaction
        msg.sender.transfer(currentExecutorBalance);
        emit LogExecutorBalanceWithdrawal(msg.sender,
                                          currentExecutorBalance
        );
    }
    // =========


    //_____________ Interface for GelatoCore Owner __________
    event LogMinStakePerExecutionClaimUpdated(uint256 minStakePerExecutionClaim,
                                              uint256 newminStakePerExecutionClaim
    );
    function updateMinStakePerExecutionClaim(uint256 _newMinStakePerExecutionClaim)
        onlyOwner
        external
    {
        emit LogMinStakePerExecutionClaimUpdated(minStakePerExecutionClaim,
                                                 _newMinStakePerExecutionClaim
        );
        minStakePerExecutionClaim = _newMinStakePerExecutionClaim;
    }

    event LogExecutorProfitUpdated(uint256 executorProfit,
                                   uint256 newExecutorProfit
    );
    function updateExecutorProfit(uint256 _newExecutorProfit)
        onlyOwner
        external
    {
        emit LogExecutorProfitUpdated(executorProfit, _newExecutorProfit);
        executorProfit = _newExecutorProfit;
    }

    event LogExecutorGasPriceUpdated(uint256 executorGasPrice,
                                     uint256 newExecutorGasPrice
    );
    function updateExecutorGasPrice(uint256 _newExecutorGasPrice)
        onlyOwner
        external
    {
        emit LogExecutorGasPriceUpdated(executorGasPrice, _newExecutorGasPrice);
        executorGasPrice = _newExecutorGasPrice;
    }


    event LogGasOutsideGasleftChecksUpdated(uint256 gasOutsideGasleftChecks,
                                            uint256 newGasOutsideGasleftChecks
    );
    function updateGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasOutsideGasleftChecksUpdated(gasOutsideGasleftChecks,
                                               _newGasOutsideGasleftChecks
        );
        gasOutsideGasleftChecks = _newGasOutsideGasleftChecks;
    }

    event LogGasInsideGasleftChecksUpdated(uint256 gasInsideGasleftChecks,
                                           uint256 newGasInsideGasleftChecks
    );
    function updateGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasInsideGasleftChecksUpdated(gasInsideGasleftChecks,
                                              _newGasInsideGasleftChecks
        );
        gasInsideGasleftChecks = _newGasInsideGasleftChecks;
    }

    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas,
                                  uint256 newcanExecMaxGas
    );
    function updateCanExecMaxGas(uint256 _newCanExecMaxGas)
        onlyOwner
        external
    {
        emit LogUpdatedCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }

    event LogExecutorGasRefundEstimateUpdated(uint256 executorGasRefundEstimate,
                                              uint256 newExecutorGasRefundEstimate
    );
    function updateExecutorGasRefund(uint256 _newExecutorGasRefundEstimate)
        onlyOwner
        external
    {
        emit LogExecutorGasRefundEstimateUpdated(executorGasRefundEstimate,
                                                 _newExecutorGasRefundEstimate
        );
        executorGasRefundEstimate = _newExecutorGasRefundEstimate;
    }

    event LogCancelIncentiveUpdated(uint256 cancelIncentive,
                                    uint256 newCancelIncentive
    );
    function updateCancelIncentive(uint256 _newCancelIncentive)
        onlyOwner
        external
    {
        emit LogCancelIncentiveUpdated(cancelIncentive,
                                       _newCancelIncentive
        );
        cancelIncentive = _newCancelIncentive;
    }
    // =========================
}
