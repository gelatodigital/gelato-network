pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';

contract GelatoCore is Ownable, Claim {
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

    // Libraries inherited from Claim:
    // using Counters for Counters.Counter;
    // using SafeMath for uint256;
    // Counter for execution Claims
    Counters.Counter private _executionClaimIds;

    // The EXECUTION CLAIM ERC721 struct
    struct ExecutionClaim {
        address dappInterface;
        bytes functionSignature;
    }

    // **************************** State Variables **********************************
    // executionClaimId => ExecutionClaim
    mapping(uint256 => ExecutionClaim) public executionClaims;

    //_____________ Gelato Execution Economics ________________
    // Balance of interfaces which pay for claim execution
    mapping(address => uint256) public interfaceBalances;

    // Minimum ether balance of interfaces
    uint256 public minInterfaceBalance;

    // Fees in % paid to executors for their execution. E.g. 5 == 5%
    uint256 public executorProfit;

    // The gas price that executors must take - this must be continually set
    uint256 public executorGasPrice;

    // Gas cost of all execute() instructions after endGas => 13034
    // Gas cost to initialize transaction = 21000
    // Sum: 34034
    uint256 public execFNGasOverhead;

    // Minimum gas refunds given that we nullify 3 state variables in each execution
    // @DEV We somehow get a greater refund, investigate
    uint256 public execFNRefundedGas;

    // The gasPrice core provides as a default for interface as a basis to charge users
    uint256 public recommendedGasPriceForInterfaces;
    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Economics END ________________

    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _newMinInterfaceBalance,
                uint256 _executorProfit,
                uint256 _executorGasPrice,
                uint256 _execFNGasOverhead,
                uint256 _execFNRefundedGas,
                uint256 _recommendedGasPriceForInterfaces
    )
        public
    {
        minInterfaceBalance = _newMinInterfaceBalance;
        executorProfit = _executorProfit;
        executorGasPrice = _executorGasPrice;
        execFNGasOverhead = _execFNGasOverhead;
        execFNRefundedGas = _execFNRefundedGas;
        recommendedGasPriceForInterfaces = _recommendedGasPriceForInterfaces;
    }
    // **************************** Gelato Core constructor() END *****************************

    // Fallback function needed for arbitrary funding additions to Gelato Core's balance by owner
    function() external payable {
        require(isOwner(),
            "fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }

    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(bytes calldata _functionSignature,
                                address _executionClaimOwner
    )
        payable
        external
    {
        // Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            _functionSignature
        );

        // ****** Mint new executionClaim ERC721 token ******
        // Increment the current token id
        Counters.increment(_executionClaimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_executionClaimOwner, executionClaimId);
        // ****** Mint new executionClaim ERC721 token END ******

        // ExecutionClaims tracking state variable update
        // ERC721(executionClaimId) => ExecutionClaim(struct)
        executionClaims[executionClaimId] = executionClaim;

        // Emit event to notify executors that a new sub order was created
        emit LogNewExecutionClaimMinted(msg.sender,  // dappInterface
                                        _functionSignature,
                                        executionClaimId
        );
    }
    // **************************** mintExecutionClaim() END ******************************

    // READ
    // **************************** ExecutionClaim Struct Getters ***************************
    // ********* ExecutionClaim Getters *********
    function getCurrentExecutionClaimId()
        public
        view
        returns(uint256)
    {
        uint256 currentId = _executionClaimIds.current();
        return currentId;
    }

    // To get executionClaimOwner call ownerOf(executionClaimId)

    // Getters for individual Execution Claim fields
    // To get executionClaim interface
    function getExecutionClaimInterface(uint256 _executionClaimId)
        public
        view
        returns(address)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];
        return executionClaim.dappInterface;
    }

    // To get claim functionSelector
    function getExecutionClaimFunctionSignature(uint256 _executionClaimId)
        public
        view
        returns(bytes memory)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];
        return executionClaim.functionSignature;
    }
    // **************************** ExecutionClaim Struct Getters END ***************************

    // Update
    // **************************** Core Updateability ******************************
    // *** Gelato Params Governance ****
    // Updating the min ether balance of interfaces
    function updateMinInterfaceBalance(uint256 _newMinInterfaceBalance)
        public
        onlyOwner
    {
        emit LogMinInterfaceBalanceUpdated(minInterfaceBalance, _newMinInterfaceBalance);
        minInterfaceBalance = _newMinInterfaceBalance;
    }

    // Set the global fee an executor can receive in the gelato system
    function updateExecutorProfit(uint256 _newExecutorProfit)
        public
        onlyOwner
    {
        emit LogExecutorProfitUpdated(executorProfit, _newExecutorProfit);
        executorProfit = _newExecutorProfit;
    }

    // Set the global max gas price an executor can receive in the gelato system
    function updateExecutorGasPrice(uint256 _newExecutorGasPrice)
        public
        onlyOwner
    {
        emit LogExecutorGasPriceUpdated(executorGasPrice, _newExecutorGasPrice);
        executorGasPrice = _newExecutorGasPrice;
    }

    // Update GAS_OVERHEAD
    function updateExecFNGasOverhead(uint256 _newExecFNGasOverhead)
        public
        onlyOwner
    {
        emit LogExecFNGasOverheadUpdated(execFNGasOverhead, _newExecFNGasOverhead);
        execFNGasOverhead = _newExecFNGasOverhead;
    }

    // Update GAS_REFUND
    function updateExecFNRefundedGas(uint256 _newExecFNRefundedGas)
        public
        onlyOwner
    {
        emit LogExecFNRefundedGasUpdated(execFNRefundedGas, _newExecFNRefundedGas);
        execFNRefundedGas = _newExecFNRefundedGas;
    }

    // Update gas price recommendation for interfaces
    function updateRecommendedGasPriceForInterfaces(uint256 _newRecommendedGasPrice)
        public
        onlyOwner
    {
        emit LogRecommendedGasPriceForInterfacesUpdated(recommendedGasPriceForInterfaces, _newRecommendedGasPrice);
        recommendedGasPriceForInterfaces = _newRecommendedGasPrice;
    }
    // *** Gelato Params Governance END ****

    // *** Interface Params Governance ****
    // Enable interfaces to add a balance to Gelato to pay for transaction executions
    function addInterfaceBalance()
        public
        payable
    {
        require(msg.value > 0, "GelatoCore.addInterfaceBalance(): Msg.value must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        uint256 newBalance = currentInterfaceBalance.add(msg.value);
        interfaceBalances[msg.sender] = newBalance;
        emit LogInterfaceBalanceAdded(msg.sender,
                                      currentInterfaceBalance,
                                      msg.value,
                                      newBalance
        );
    }

    // Enable interfaces to withdraw some of their added balances
    function withdrawInterfaceBalance(uint256 _withdrawAmount)
        external
    {
        require(_withdrawAmount > 0, "WithdrawAmount must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        require(_withdrawAmount <= currentInterfaceBalance,
            "GelatoCore.withdrawInterfaceBalance(): WithdrawAmount must be smaller or equal to the interfaces current balance"
        );
        interfaceBalances[msg.sender] = currentInterfaceBalance.sub(_withdrawAmount);
        msg.sender.transfer(_withdrawAmount);
        emit LogInterfaceBalanceWithdrawal(msg.sender,
                                           currentInterfaceBalance,
                                           _withdrawAmount,
                                           interfaceBalances[msg.sender]
        );
    }
    // *** Interface Params Governance END ****
    // **************************** Core Updateability END ******************************


    // DELETE
    // **************************** execute() ***************************
    function execute(uint256 _executionClaimId)
        external
        returns (bytes memory)
    {
        // // Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // Fetch execution
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // // Fetch execution claim variables
        // Interface Function signature
        bytes memory functionSignature = executionClaim.functionSignature;
        // Interface Address
        address dappInterface = executionClaim.dappInterface;
        // Get the executionClaimOwner before burning
        address executionClaimOwner = ownerOf(_executionClaimId);

        // Determine cappedGasPriceUsed used to calculate the final executor payout
        // If tx Gas Price is higher than executorGasPrice, use executorGasPrice
        uint256 cappedGasPriceUsed;
        tx.gasprice > executorGasPrice ? cappedGasPriceUsed = executorGasPrice : cappedGasPriceUsed = tx.gasprice;

        // **** CHECKS ****
        // Check if Interface has sufficient balance on core
        // @DEV, minimum balance requirement for interfaces (e.g. 0.5 ETH). If it goes below that, we wont execute, hence interface devs simply have to make sure their value does not drop below that limit
        require(interfaceBalances[dappInterface] >= minInterfaceBalance,
            "GelatoCore.execute(): Interface does not have enough balance in core, needs at least minInterfaceBalance"
        );
        // **** CHECKS END ****;

        // **** EFFECTS ****
        // Delete
        // Delete the ExecutionClaim struct (part of r)
        delete executionClaims[_executionClaimId];
        // ******** EFFECTS END ****

        // Interactions
        // Call Interface
        // ******* Gelato Interface Call *******
        (bool success, ) = dappInterface.call(functionSignature);
        // @notice: Executor griefing via reverts prevention: call estimateGas before executing
        //  web3 estimateGas supposed to return gasLimit if tx would revert
        require(success == true, "execute(): Execution of dappInterface function must be successful");
        // ******* Gelato Interface Call END *******

        // **** EFFECTS 2 ****
        // Delete (part of r)
        // Burn Claim. Should be done here to we done have to store the claim Owner on the interface. Deleting the struct on the core should suffice, as an exeuctionClaim Token without the associated struct is worthless. => Discuss
        _burn(_executionClaimId);

        // ******** EFFECTS 2 END ****
        // Burn the executed executionClaim

        // Calc executor payout
        // How much gas we have left in this tx
        uint256 endGas = gasleft();
        // Calaculate how much gas we used up in this function. Subtract the certain gas refunds the executor will receive for nullifying values
        // Gas Overhead corresponds to the actions occuring before and after the gasleft() calcs
        uint256 gasUsedEstimate = startGas.sub(endGas).add(execFNGasOverhead).sub(execFNRefundedGas);
        // @DEV: Everything below here is to be accounted for in execFNGasOverhead
        // Calculate Total Cost
        uint256 executionCostEstimate = gasUsedEstimate.mul(cappedGasPriceUsed);
        // Calculate Executor Payout (including a fee set by GelatoCore.sol)
        // uint256 executorPayout= executionCostEstimate.mul(100 + executorProfit).div(100);
        uint256 executorPayout= executionCostEstimate.add(executorProfit);

        // Effects 2: Decrease interface balance
        // To ensure that executor does not get revert due to interfaceBalance
        require(executorPayout <= minInterfaceBalance,
            "GelatoCore.execute(): executorPayout should not be greater than minInterfaceBalance"
        );
        interfaceBalances[dappInterface] = interfaceBalances[dappInterface].sub(executorPayout);

        // Conduct the payout to the executor
        // Transfer the prepaid fee to the executor as reward
        msg.sender.transfer(executorPayout);


        // Emit event now before deletion of struct
        emit LogClaimExecutedBurnedAndDeleted(dappInterface,
                                              _executionClaimId,
                                              executionClaimOwner,
                                              msg.sender,  // executor
                                              executorPayout,
                                              executorProfit,
                                              gasUsedEstimate,
                                              cappedGasPriceUsed,
                                              executionCostEstimate
        );

        //
    }
    // **************************** execute() END ***************************


    // **************************** cancelExecutionClaim() ***************************
    function cancelExecutionClaim(uint256 _executionClaimId)
        external
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(executionClaim.dappInterface,
                                        _executionClaimId,
                                        ownerOf(_executionClaimId)
        );
        _burn(_executionClaimId);
        delete executionClaims[_executionClaimId];
    }
    // **************************** cancelExecutionClaim() END ***************************
}


