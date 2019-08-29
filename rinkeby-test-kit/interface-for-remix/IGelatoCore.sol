pragma solidity ^0.5.0;

interface IGelatoCore {
    // **************************** Events **********************************
    // Create
    event LogNewExecutionClaimMinted(address indexed dappInterface,
                                     bytes indexed functionSignature,
                                     uint256 executionClaimId
    );
    // Update
    // - Gelato Params
    event LogMinInterfaceBalanceUpdated(uint256 minInterfaceBalance, uint256 newMinInterfaceBalance);
    event LogExecutorProfitUpdated(uint256 executorProfit, uint256 newExecutorProfit);
    event LogExecutorGasPriceUpdated(uint256 executorGasPrice, uint256 newExecutorGasPrice);
    event LogExecFNGasOverheadUpdated(uint256 execFNGasOverhead, uint256 newExecFNGasOverhead);
    event LogExecFNRefundedGasUpdated(uint256 execFNRefundedGas, uint256 newExecFNRefundedGas);
    event LogRecommendedGasPriceForInterfacesUpdated(uint256 recommendedGasPriceForInterfaces,
                                                     uint256 newRecommendedGasPriceForInterfaces
    );
    // - Interface Params
    event LogInterfaceBalanceAdded(address indexed dappInterface,
                                   uint256 oldBalance,
                                   uint256 addedAmount,
                                   uint256 newBalance
    );
    event LogInterfaceBalanceWithdrawal(address indexed dappInterface,
                                        uint256 oldBalance,
                                        uint256 withdrawnAmount,
                                        uint256 newBalance
    );
    // Delete
    event LogClaimExecutedBurnedAndDeleted(address indexed dappInterface,
                                           uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner,
                                           address payable executor,
                                           uint256 executorPayout,
                                           uint256 executorProfit,
                                           uint256 gasUsedEstimate,
                                           uint256 cappedGasPriceUsed,
                                           uint256 executionCostEstimate
    );
    event LogExecutionClaimCancelled(address indexed dappInterface,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner
    );
    // **************************** Events END **********************************


    // **************************** State Variables **********************************


    //_____________ Gelato Execution Economics ________________
    // Balance of interfaces which pay for claim execution
    function interfaceBalances(address _dappInterface) external returns(uint256);

    // Minimum ether balance of interfaces
    function minInterfaceBalance() external returns(uint256);

    // Fees in % paid to executors for their execution. E.g. 5 == 5%
    function executorProfit() external returns(uint256);

    // The gas price that executors must take - this must be continually set
    function executorGasPrice() external returns(uint256);

    // Gas cost of all execute() instructions after endGas => 13034
    // Gas cost to initialize transaction = 21000
    // Sum: 34034
    function execFNGasOverhead() external returns(uint256);

    // Minimum gas refunds given that we nullify 3 state variables in each execution
    // @DEV We somehow get a greater refund, investigate
    function execFNRefundedGas() external returns(uint256);

    // The gasPrice core provides as a default for interface as a basis to charge users
    function recommendedGasPriceForInterfaces() external returns(uint256);
    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Economics END ________________


    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(bytes calldata _functionSignature,
                                address _executionClaimOwner
    )
        payable
        external;
    // **************************** mintExecutionClaim() END ******************************

    // READ
    // **************************** ExecutionClaim Struct Getters ***************************
    // ********* ExecutionClaim Getters *********
    function getCurrentExecutionClaimId() external view returns(uint256);


    // To get executionClaimOwner call ownerOf(executionClaimId)

    // Getters for individual Execution Claim fields
    // To get executionClaim interface
    function getExecutionClaimInterface(uint256 _executionClaimId) external view returns(address);

    // To get claim functionSelector
    function getExecutionClaimFunctionSignature(uint256 _executionClaimId) external view returns(bytes memory);
    // **************************** ExecutionClaim Struct Getters END ***************************

    // Update
    // **************************** Core Updateability ******************************
    // *** Gelato Params Governance ****
    // Updating the min ether balance of interfaces
    function updateMinInterfaceBalance(uint256 _newMinInterfaceBalance) external;

    // Set the global fee an executor can receive in the gelato system
    function updateExecutorProfit(uint256 _newExecutorProfit) external;

    // Set the global max gas price an executor can receive in the gelato system
    function updateExecutorGasPrice(uint256 _newExecutorGasPrice) external;

    // Update GAS_OVERHEAD
    function updateExecFNGasOverhead(uint256 _newExecFNGasOverhead) external;

    // Update GAS_REFUND
    function updateExecFNRefundedGas(uint256 _newExecFNRefundedGas) external;

    // Update gas price recommendation for interfaces
    function updateRecommendedGasPriceForInterfaces(uint256 _newRecommendedGasPrice) external;
    // *** Gelato Params Governance END ****

    // *** Interface Params Governance ****
    // Enable interfaces to add a balance to Gelato to pay for transaction executions
    function addInterfaceBalance() external payable;

    // Enable interfaces to withdraw some of their added balances
    function withdrawInterfaceBalance(uint256 _withdrawAmount) external;
    // *** Interface Params Governance END ****
    // **************************** Core Updateability END ******************************


    // DELETE
    // **************************** execute() ***************************
    function execute(uint256 _executionClaimId) external returns (bytes memory);
    // **************************** execute() END ***************************


    // **************************** cancelExecutionClaim() ***************************
    function cancelExecutionClaim(uint256 _executionClaimId) external;
    // **************************** cancelExecutionClaim() END ***************************
}


