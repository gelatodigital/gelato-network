pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

contract GelatoCoreAccounting is Ownable, ReentrancyGuard {

    // Fallback Function
    function() external payable {
        require(isOwner(),
            "GelatoCore.fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) public interfaceBalances;
    mapping(address => uint256) public executorBalances;
    uint256 public minInterfaceBalance;
    uint256 public executorProfit;
    uint256 public executorGasPrice;
    uint256 public defaultGasPriceForInterfaces;
    //_____________ Constant gas values _____________
    uint256 public gasOutsideGasleftChecks;
    uint256 public gasInsideGasleftChecks;
    uint256 public canExecMaxGas;
    uint256 public executorGasRefundEstimate;
    // =========================

    modifier stakedInterface {
        require(interfaceBalances[msg.sender] >= minInterfaceBalance,
            "GelatoCore.stakedInterfaces: fail"
        );
        _;
    }

    //_____________ Interface  _________________________________________
    event LogInterfaceBalanceAdded(address indexed dappInterface,
                                   uint256 oldBalance,
                                   uint256 addedAmount,
                                   uint256 newBalance
    );
    function addInterfaceBalance()
        external
        payable
    {
        require(msg.value > 0,
            "GelatoCoreAccounting.addInterfaceBalance(): zero-value"
        );
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        uint256 newBalance = currentInterfaceBalance.add(msg.value);
        interfaceBalances[msg.sender] = newBalance;
        emit LogInterfaceBalanceAdded(msg.sender,
                                      currentInterfaceBalance,
                                      msg.value,
                                      newBalance
        );
    }

    event LogInterfaceBalanceWithdrawal(address indexed dappInterface,
                                        uint256 oldBalance,
                                        uint256 withdrawnAmount,
                                        uint256 newBalance
    );
    function withdrawInterfaceBalance(uint256 _withdrawAmount)
        nonReentrant
        external
    {
        require(_withdrawAmount > 0,
            "GelatoCoreAccounting.withdrawInterfaceBalance(): zero-value"
        );
        // Checks
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        require(_withdrawAmount <= currentInterfaceBalance,
            "GelatoCoreAccounting.withdrawInterfaceBalance(): failed"
        );
        // Effects
        interfaceBalances[msg.sender] = currentInterfaceBalance.sub(_withdrawAmount);
        // Interaction
        msg.sender.transfer(_withdrawAmount);
        emit LogInterfaceBalanceWithdrawal(msg.sender,
                                           currentInterfaceBalance,
                                           _withdrawAmount,
                                           interfaceBalances[msg.sender]
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
    event LogMinInterfaceBalanceUpdated(uint256 minInterfaceBalance,
                                        uint256 newMinInterfaceBalance
    );
    function updateMinInterfaceBalance(uint256 _newMinInterfaceBalance)
        public
        onlyOwner
    {
        emit LogMinInterfaceBalanceUpdated(minInterfaceBalance, _newMinInterfaceBalance);
        minInterfaceBalance = _newMinInterfaceBalance;
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

    event LogDefaultGasPriceForInterfacesUpdated(uint256 defaultGasPriceForInterfaces,
                                                 uint256 newDefaultGasPriceForInterfaces
    );
    function updateDefaultGasPriceForInterfaces(uint256 _newDefaultGasPrice)
        public
        onlyOwner
    {
        emit LogDefaultGasPriceForInterfacesUpdated(defaultGasPriceForInterfaces,
                                                    _newDefaultGasPrice
        );
        defaultGasPriceForInterfaces = _newDefaultGasPrice;
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

    event LogGasInsideGasleftChecksUpdated(uint256 execFNGas2,
                                           uint256 newExecFNGas2
    );
    function updateGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks)
        public
        onlyOwner
    {
        emit LogGasInsideGasleftChecksUpdated(gasInsideGasleftChecks, _newGasInsideGasleftChecks);
        gasInsideGasleftChecks = _newGasInsideGas   tChecks;
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

    event LogExecutorGasRefundEstimateUpdated(uint256 execFNRefundedGas,
                                              uint256 newExecFNRefundedGas
    );
    function updateExecutorGasRefund(uint256 _newExecutorGasRefund)
        public
        onlyOwner
    {
        emit LogUpdatedExecutorGasRefund(executorGasRefund, _newExecutorGasRefund);
        executorGasRefund = _newExecutorGasRefund;
    }
    // =========================
}
