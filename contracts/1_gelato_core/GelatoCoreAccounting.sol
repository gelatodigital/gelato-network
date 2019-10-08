pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract GelatoCoreAccounting is Ownable,
                                 ReentrancyGuard
{
    using SafeMath for uint256;

    // Fallback Function
    function() external payable {
        require(isOwner(),
            "GelatoCore.fallback: only owner should send ether without fnSelector."
        );
    }

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) public gtaiBalances;
    mapping(address => uint256) public gtaiExecutionClaimsCounter;
    mapping(address => uint256) public executorBalances;
    uint256 public minStakePerExecutionClaim;
    uint256 public executorProfit;
    uint256 public executorGasPrice;
    //_____________ Constant gas values _____________
    uint256 public gasOutsideGasleftChecks;
    uint256 public gasInsideGasleftChecks;
    uint256 public canExecMaxGas;
    uint256 public executorGasRefundEstimate;
    uint256 public cancelIncentive;
    // =========================

    function getGTAIBalanceRequirement(address _GTAI)
        public
        view
        returns(uint256 gtaiBalanceRequirement)
    {
        gtaiBalanceRequirement
            = minStakePerExecutionClaim.mul(gtaiExecutionClaimsCounter[_GTAI]);
    }

    function gtaiHasSufficientBalance(address _GTAI)
        public
        view
        returns(bool)
    {
        return gtaiBalances[_GTAI] >= getGTAIBalanceRequirement(_GTAI);
    }
    modifier gtaiBalanceOk() {
        require(gtaiHasSufficientBalance(msg.sender),
            "GelatoCoreAccounting.gtaiBalanceOk: fail"
        );
        _;
    }

    //_____________ Interface  _________________________________________
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
    // =========================

    //_____________ Executor _________________________________________________
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
    // =========================


    //_____________ Update Gelato Accounting ___________________________________
    event LogMinStakePerExecutionClaimUpdated(uint256 minStakePerExecutionClaim,
                                   uint256 newminStakePerExecutionClaim
    );
    function updateMinStakePerExecutionClaim(uint256 _newMinStakePerExecutionClaim)
        public
        onlyOwner
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
        public
        onlyOwner
    {
        emit LogExecutorProfitUpdated(executorProfit, _newExecutorProfit);
        executorProfit = _newExecutorProfit;
    }

    event LogExecutorGasPriceUpdated(uint256 executorGasPrice,
                                     uint256 newExecutorGasPrice
    );
    function updateExecutorGasPrice(uint256 _newExecutorGasPrice)
        public
        onlyOwner
    {
        emit LogExecutorGasPriceUpdated(executorGasPrice, _newExecutorGasPrice);
        executorGasPrice = _newExecutorGasPrice;
    }


    event LogGasOutsideGasleftChecksUpdated(uint256 gasOutsideGasleftChecks,
                                            uint256 newGasOutsideGasleftChecks
    );
    function updateGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks)
        public
        onlyOwner
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
        public
        onlyOwner
    {
        emit LogGasInsideGasleftChecksUpdated(gasInsideGasleftChecks, _newGasInsideGasleftChecks);
        gasInsideGasleftChecks = _newGasInsideGasleftChecks;
    }

    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas,
                                  uint256 newcanExecMaxGas
    );
    function updateCanExecMaxGas(uint256 _newCanExecMaxGas)
        public
        onlyOwner
    {
        emit LogUpdatedCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }

    event LogExecutorGasRefundEstimateUpdated(uint256 executorGasRefundEstimate,
                                              uint256 newExecutorGasRefundEstimate
    );
    function updateExecutorGasRefund(uint256 _newExecutorGasRefundEstimate)
        public
        onlyOwner
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
        public
        onlyOwner
    {
        emit LogCancelIncentiveUpdated(cancelIncentive,
                                       _newCancelIncentive
        );
        cancelIncentive = _newCancelIncentive;
    }
    // =========================
}
