pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract GelatoCoreAccounting is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Fallback Function
    function() external payable {
        require(isOwner(),
            "GelatoCore.fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) public gtaiBalances;
    mapping(address => uint256) public executorBalances;
    uint256 public minGTAIBalance;
    uint256 public executorProfit;
    uint256 public executorGasPrice;
    uint256 public defaultGasPriceForGTAIs;
    //_____________ Constant gas values _____________
    uint256 public gasOutsideGasleftChecks;
    uint256 public gasInsideGasleftChecks;
    uint256 public canExecMaxGas;
    uint256 public executorGasRefundEstimate;
    // =========================

    modifier onlyStakedGTAI() {
        require(gtaiBalances[msg.sender] >= minGTAIBalance,
            "GelatoCore.stakedGTAIs: fail"
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
        // Checks
        uint256 currentBalance = gtaiBalances[msg.sender];
        require(_withdrawAmount <= currentBalance,
            "GelatoCoreAccounting.withdrawGTAIBalance(): failed"
        );
        // Effects
        gtaiBalances[msg.sender] = currentBalance.sub(_withdrawAmount);
        // Interaction
        msg.sender.transfer(_withdrawAmount);
        emit LogGTAIBalanceWithdrawal(msg.sender,
                                      currentBalance,
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
    event LogMinGTAIBalanceUpdated(uint256 minGTAIBalance,
                                   uint256 newMinGTAIBalance
    );
    function updateMinGTAIBalance(uint256 _newMinGTAIBalance)
        public
        onlyOwner
    {
        emit LogMinGTAIBalanceUpdated(minGTAIBalance, _newMinGTAIBalance);
        minGTAIBalance = _newMinGTAIBalance;
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

    event LogDefaultGasPriceForGTAIsUpdated(uint256 defaultGasPriceForGTAIs,
                                            uint256 newDefaultGasPriceForGTAIs
    );
    function updateDefaultGasPriceForInterfaces(uint256 _newDefaultGasPriceForGTAIs)
        public
        onlyOwner
    {
        emit LogDefaultGasPriceForGTAIsUpdated(defaultGasPriceForGTAIs,
                                               _newDefaultGasPriceForGTAIs
        );
        defaultGasPriceForGTAIs = _newDefaultGasPriceForGTAIs;
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
    // =========================
}
