pragma solidity ^0.5.0;

interface IGelatoCore {
    // IOwnable.sol
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /**
     * @dev Returns the address of the current owner.
     */
    function owner() external view returns (address);

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() external view returns (bool);

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() external;

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) external;


    // IClaim.sol
    /**
     * @dev Gets the balance of the specified address.
     * @param owner address to query the balance of
     * @return uint256 representing the amount owned by the passed address
     */
    function balanceOf(address owner) external view returns (uint256);

    /**
     * @dev Gets the owner of the specified token ID.
     * @param tokenId uint256 ID of the token to query the owner of
     * @return address currently marked as the owner of the given token ID
     */
    function ownerOf(uint256 tokenId) external view returns (address);

    /**
     * @dev Approves another address to transfer the given token ID
     * The zero address indicates there is no approved address.
     * There can only be one approved address per token at a given time.
     * Can only be called by the token owner or an approved operator.
     * @param to address to be approved for the given token ID
     * @param tokenId uint256 ID of the token to be approved
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Gets the approved address for a token ID, or zero if no address set
     * Reverts if the token ID does not exist.
     * @param tokenId uint256 ID of the token to query the approval of
     * @return address currently approved for the given token ID
     */
    function getApproved(uint256 tokenId) external view returns (address);

    /**
     * @dev Sets or unsets the approval of a given operator
     * An operator is allowed to transfer all tokens of the sender on their behalf.
     * @param to operator address to set the approval
     * @param approved representing the status of the approval to be set
     */
    function setApprovalForAll(address to, bool approved) external;

    /**
     * @dev Tells whether an operator is approved by a given owner.
     * @param owner owner address which you want to query the approval of
     * @param operator operator address which you want to query the approval of
     * @return bool whether the given operator is approved by the given owner
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    /**
     * @dev Transfers the ownership of a given token ID to another address.
     * Usage of this method is discouraged, use `safeTransferFrom` whenever possible.
     * Requires the msg.sender to be the owner, approved, or operator.
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */
    function transferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Safely transfers the ownership of a given token ID to another address
     * If the target address is a contract, it must implement `onERC721Received`,
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * Requires the msg.sender to be the owner, approved, or operator
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata _data) external;

    // GELATO_CORE.sol
    // **************************** Events **********************************
    // Create
    event LogNewExecutionClaimMinted(address indexed dappInterface,
                                     bytes indexed functionSignature,
                                     uint256 executionClaimId
    );
    // Update
    // - Gelato Params
    event LogMinInterfaceBalanceUpdated(uint256 minStakePerExecutionClaim, uint256 newMinInterfaceBalance);
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
                                           address indexed user,
                                           address payable executor,
                                           uint256 executorPayout,
                                           uint256 executorProfit,
                                           uint256 gasUsedEstimate,
                                           uint256 cappedGasPriceUsed,
                                           uint256 executionCostEstimate
    );
    event LogExecutionClaimCancelled(address indexed dappInterface,
                                     uint256 indexed executionClaimId,
                                     address indexed user
    );
    // **************************** Events END **********************************


    // **************************** State Variables **********************************


    //_____________ Gelato Execution Economics ________________
    // ExecutionClaim instructions
    function executionClaims(uint256 executionClaimId) external view returns(address, bytes memory);

    // Balance of interfaces which pay for claim execution
    function gtaiBalances(address _dappInterface) external view returns(uint256);

    // Minimum ether balance of interfaces
    function minStakePerExecutionClaim() external view returns(uint256);

    // Fees in % paid to executors for their execution. E.g. 5 == 5%
    function executorProfit() external view returns(uint256);

    // The gas price that executors must take - this must be continually set
    function executorGasPrice() external view returns(uint256);

    // Gas cost of all execute() instructions after endGas => 13034
    // Gas cost to initialize transaction = 21000
    // Sum: 34034
    function execFNGasOverhead() external view returns(uint256);

    // Minimum gas refunds given that we nullify 3 state variables in each execution
    // @DEV We somehow get a greater refund, investigate
    function execFNRefundedGas() external view returns(uint256);

    // The gasPrice core provides as a default for interface as a basis to charge user
    function recommendedGasPriceForInterfaces() external view  returns(uint256);
    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Economics END ________________


    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(bytes calldata _functionSignature,
                                address _user
    )
        payable
        external;
    // **************************** mintExecutionClaim() END ******************************

    // READ
    // **************************** ExecutionClaim Struct Getters ***************************
    // ********* ExecutionClaim Getters *********
    function getCurrentExecutionClaimId() external view returns(uint256);


    // To get user call ownerOf(executionClaimId)

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
    function addGTAIBalance() external payable;

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


