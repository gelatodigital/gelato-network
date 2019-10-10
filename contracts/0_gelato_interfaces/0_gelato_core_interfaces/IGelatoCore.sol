pragma solidity ^0.5.10;

interface IGelatoCore {
    // ___________ GelatoCore _______________________________________
    // ______ State Readers _____________
    function getCurrentExecutionClaimId() external view returns(uint256);
    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        view
        returns(bytes32);
    // =====
    // ______ State Mutators _____________
    // ______ For GTAIs ___
    event LogNewExecutionClaimMinted(address indexed GTAI,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner,
                                     address triggerAddress,
                                     bytes triggerPayload,
                                     address action,
                                     bytes actionPayload,
                                     uint256 actionGasStipend,
                                     uint256 executionClaimExpiryDate
    );
    function mintExecutionClaim(address _executionClaimOwner,
                                address _trigger,
                                bytes calldata _triggerPayload,
                                address _action,
                                bytes calldata _specificActionParams,
                                uint256 _executionClaimLifespan
    )
        external;
    // ==
    // ______ For Executors ___
    enum CanExecuteCheck {
        ExecutionClaimExpired,
        InsufficientGTAIBalance,
        InvalidExecutionClaim,
        WrongCalldata,
        TriggerReverted,
        Executable,
        NotExecutable
    }
    function canExecute(address _trigger,
                        bytes calldata _triggerPayload,
                        address _action,
                        bytes calldata _actionPayload,
                        uint256 _actionGasStipend,
                        address _GTAI,
                        uint256 _executionClaimId,
                        uint256 _executionClaimExpiryDate
    )
        external
        view
        // 0 as first return value == 'executable'
        returns(uint8);

    event LogCanExecuteFailed(uint256 indexed executionClaimId,
                              address payable indexed executor,
                              uint256 indexed canExecuteResult
    );
    event LogExecutionResult(uint256 indexed executionClaimId,
                             bool indexed success,
                             address payable indexed executor
    );
    event LogClaimExecutedBurnedAndDeleted(uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner,
                                           address indexed GTAI,
                                           address payable executor,
                                           uint256 accountedGasPrice,
                                           uint256 gasUsedEstimate,
                                           uint256 executionCostEstimate,
                                           uint256 executorProfit,
                                           uint256 executorPayout
    );
    enum ExecutionResult {
        Success,
        Failure,
        CanExecuteFailed
    }
    function execute(address _trigger,
                     bytes calldata _triggerPayload,
                     address _action,
                     bytes calldata _actionPayload,
                     uint256 _actionGasStipend,
                     address _GTAI,
                     uint256 _executionClaimId,
                     uint256 _executionClaimExpiryDate

    )
        external
        returns(uint8);
    // ==
    // ______ For Users or Executors ___
    event LogExecutionClaimCancelled(uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner,
                                     address indexed GTAI
    );
    function cancelExecutionClaim(uint256 _executionClaimId,
                                  address _GTAI,
                                  address _trigger,
                                  bytes calldata _triggerPayload,
                                  address _action,
                                  bytes calldata _actionPayload,
                                  uint256 _actionGasStipend,
                                  uint256 _executionClaimExpiryDate
    )
        external;
    // ==
    // =====
    // =========================

    // ___________ GelatoCoreAccounting _______________________________________
    // ______ State Readers _____________
    function getGTAIBalance(address _gtai) external view returns(uint256);
    function getGTAIExecutionClaimsCounter(address _gtai) external view returns(uint256);
    function getExecutorBalance(address _executor) external view returns(uint256);
    function getMinStakePerExecutonClaim() external view returns(uint256);
    function getExecutorProfit() external view returns(uint256);
    function getExecutorGasPrice() external view returns(uint256);
    function getGasOutsideGasleftChecks() external view returns(uint256);
    function getGasInsideGasleftChecks() external view returns(uint256);
    function getCanExecMaxGas() external view returns(uint256);
    function getExecutorGasRefundEstimate() external view returns(uint256);
    function getCancelIncentive() external view returns(uint256);
    function getGTAIBalanceRequirement(address _GTAI)
        external
        view
        returns(uint256);
    function sufficientBalanceCheck(address _GTAI)
        external
        view
        returns(bool);
    // =====
    // ______ State Mutators _____________
    // ____ For GTAIs _______
    event LogGTAIBalanceAdded(address indexed GTAI,
                              uint256 oldBalance,
                              uint256 addedAmount,
                              uint256 newBalance
    );
    function addGTAIBalance() external payable;
    event LogGTAIBalanceWithdrawal(address indexed GTAI,
                                   uint256 oldBalance,
                                   uint256 withdrawnAmount,
                                   uint256 newBalance
    );
    function withdrawGTAIBalance(uint256 _withdrawAmount) external;
    // ===
    // ____ For executors _______
    event LogExecutorBalanceWithdrawal(address indexed executor,
                                       uint256 withdrawAmount
    );
    function withdrawExecutorBalance() external;
    // ===
    // _ For GelatoCore Owner __
    event LogMinStakePerExecutionClaimUpdated(uint256 minStakePerExecutionClaim,
                                              uint256 newminStakePerExecutionClaim
    );
    function updateMinStakePerExecutionClaim(uint256 _newMinStakePerExecutionClaim)
        external;

    event LogExecutorProfitUpdated(uint256 executorProfit,
                                   uint256 newExecutorProfit
    );
    function updateExecutorProfit(uint256 _newExecutorProfit) external;

    event LogExecutorGasPriceUpdated(uint256 executorGasPrice,
                                     uint256 newExecutorGasPrice
    );
    function updateExecutorGasPrice(uint256 _newExecutorGasPrice) external;

    event LogGasOutsideGasleftChecksUpdated(uint256 gasOutsideGasleftChecks,
                                            uint256 newGasOutsideGasleftChecks
    );
    function updateGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks) external;

    event LogGasInsideGasleftChecksUpdated(uint256 gasInsideGasleftChecks,
                                           uint256 newGasInsideGasleftChecks
    );
    function updateGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks) external;

    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas,
                                  uint256 newcanExecMaxGas
    );
    function updateCanExecMaxGas(uint256 _newCanExecMaxGas) external;

    event LogExecutorGasRefundEstimateUpdated(uint256 executorGasRefundEstimate,
                                              uint256 newExecutorGasRefundEstimate
    );
    function updateExecutorGasRefund(uint256 _newExecutorGasRefundEstimate) external;

    event LogCancelIncentiveUpdated(uint256 cancelIncentive,
                                    uint256 newCancelIncentive
    );
    function updateCancelIncentive(uint256 _newCancelIncentive) external;
    // ===
    // =====
    // =========================
}