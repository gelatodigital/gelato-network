pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';


contract GelatoCore is Ownable, Claim {

    // Libraries inherited from Claim:
    // using Counters for Counters.Counter;

    Counters.Counter private _executionClaimIds;

    // Legacy Core Struct
    /*
    struct ExecutionClaim {
        address dappInterface;
        uint256 interfaceOrderId;
        address sellToken;
        address buyToken;
        uint256 sellAmount;  // you always sell something, in order to buy something
        uint256 executionTime;
        uint256 prepaidExecutionFee;
    }
    */

    // New Core struct
    struct ExecutionClaim {
        address dappInterface;
        bytes functionSignature;
    }

    // **************************** Events **********************************
    event LogNewExecutionClaimMinted(address indexed dappInterface,
                                     bytes indexed functionSignature,
                                     uint256 executionClaimId
    );
    event LogNewInterfaceListed(address indexed dappInterface, uint256 maxGas);
    event LogInterfaceUnlisted(address indexed dappInterface, uint256 noMaxGas);
    event LogGelatoGasPriceUpdate(uint256 newGelatoGasPrice);
    event LogMaxGasUpdate(address indexed dappInterface, uint256 newMaxGas);
    event LogClaimCancelled(address indexed dappInterface,
                            uint256 indexed executionClaimId,
                            address indexed executionClaimOwner
    );
    event LogExecutionTimeUpdated(address indexed dappInterface,
                                  uint256 indexed executionClaimId,
                                  address indexed executionClaimOwner,
                                  uint256 newExecutionTime
    );
    event LogClaimExecutedBurnedAndDeleted(address indexed dappInterface,
                                           address payable indexed executor,
                                           address executionClaimOwner,
                                           uint256 indexed executionClaimId,
                                           uint256 gelatoCorePayable
    );
    event LogExecutionMetrics(uint256 indexed gasUsed, uint256 indexed gasPrice, uint256 indexed executorPayout);

    event LogInterfaceBalanceAdded(address indexed dappInterface, uint256 indexed newBalance);
    // **************************** Events END **********************************

    // **************************** State Variables **********************************

    // executionClaimId => ExecutionClaim
    mapping(uint256 => ExecutionClaim) public executionClaims;

    // Balance of interfaces which pay for claim execution
    mapping(address => uint256) public interfaceBalances;


    //_____________ Gelato Execution Service Business Logic ________________
    // gelatoGasPrice is continually set by Gelato Core's centralised gelatoGasPrice oracle
    // The value is determined off-chain
    uint256 public gelatoGasPrice;

    // Gas cost of all execute() instructions before startGas and endGas
    uint256 gasOverhead = 50000;

    // Max Gas Price executors can receive. E.g. 50000000000 == 50GWEI
    uint256 public gelatoMaxGasPrice;

    // Fees in % paid to executors for their execution. E.g. 5 == 5%
    uint256 public gelatoExecutionMargin;
    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Service Business Logic END ________________

    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _gelatoGasPrice, uint256 _gelatoMaxGasPrice, uint256 _gelatoExecutionMargin)
        public
    {
        // Initialise gelatoGasPrice, gelatoMaxGasPrice & gelatoExecutionMargin
        gelatoGasPrice = _gelatoGasPrice;
        gelatoMaxGasPrice = _gelatoMaxGasPrice;
        gelatoExecutionMargin = _gelatoExecutionMargin;
    }
    // **************************** Gelato Core constructor() END *****************************

    // **************************** Modifiers ******************************
    modifier onlyExecutionClaimOwner(uint256 _executionClaimId) {
        require(msg.sender == ownerOf(_executionClaimId),
            "modifier onlyExecutionClaimOwner: msg.sender != ownerOf(executionClaimId)"
        );
        _;
    }
    // **************************** Modifiers END ******************************

    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(bytes memory _functionSignature,
                                address _executionClaimOwner
    )
        payable
        public
        returns (bool)
    {
        // CHECKS
        // All checks are done interface side. If interface sets wrong _functionSignature, its not the coress fault. We could check that the bytes param is not == 0x, but this would require 2 costly keccak calls

        // Step1: Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            _functionSignature
        );

        // ****** Step2: Mint new executionClaim ERC721 token ******
        // Increment the current token id
        Counters.increment(_executionClaimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_executionClaimOwner, executionClaimId);
        // ****** Step4: Mint new executionClaim ERC721 token END ******

        // Step3: ExecutionClaims tracking state variable update
        // ERC721(executionClaimId) => ExecutionClaim(struct)
        executionClaims[executionClaimId] = executionClaim;


        // Step4: Emit event to notify executors that a new sub order was created
        emit LogNewExecutionClaimMinted(msg.sender,  // dappInterface
                                        _functionSignature,
                                        executionClaimId
        );


        // Step5: Return true to caller (dappInterface)
        return true;
    }
    // **************************** mintExecutionClaim() END ******************************

    // READ
    // **************************** State Variables Getters ***************************

    function getCurrentExecutionClaimId()
        public
        view
        returns(uint256)
    {
        uint256 currentId = _executionClaimIds.current();
        return currentId;
    }


    function getGelatoGasPrice()
        public
        view
        returns(uint256)
    {
        return gelatoGasPrice;
    }


    function getInterfaceBalance(address _dappInterface)
        public
        view
        returns(uint256)
    {
        return interfaceBalances[_dappInterface];
    }

    // **************************** ExecutionClaim Getters ***************************
    // Getter for all ExecutionClaim fields
    function getExecutionClaim(uint256 _executionClaimId)
        public
        view
        returns(address dappInterface,
                bytes memory functionSelector,
                address executionClaimOwner
        )
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return (executionClaim.dappInterface,
                executionClaim.functionSignature,
                ownerOf(_executionClaimId) // fetches owner of the executionClaim token
        );
    }

    // Getters for individual Execution Claim fields
    // To get claim interface
    function getClaimInterface(uint256 _executionClaimId)
        public
        view
        returns(address)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.dappInterface;
    }

    // To get claim functionSelector
    function getClaimFunctionSignature(uint256 _executionClaimId)
        public
        view
        returns(bytes memory)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.functionSignature;
    }

    // **************************** ExecutionClaim Getters END ******************************

    // **************************** ExecutionClaim Updates  ******************************

    function cancelExecutionClaim(uint256 _executionClaimId)
        onlyExecutionClaimOwner(_executionClaimId)
        external
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // Local variables needed for Checks, Effects -> Interactions pattern
        address executionClaimOwner = ownerOf(_executionClaimId);

        // CHECKS: onlyExecutionClaimOwner modifier

        // EFFECTS: emit event, then burn and delete the ExecutionClaim struct - possible gas refund to msg.sender?
        emit LogClaimCancelled(executionClaim.dappInterface,
                               _executionClaimId,
                               executionClaimOwner
        );
        _burn(_executionClaimId);
        delete executionClaims[_executionClaimId];
    }

    // **************************** ExecutionClaim Updates END ******************************


    // Execute executionClaim
    function execute(uint256 _executionClaimId)
        public
        returns (bool, bytes memory)
    {
        // Step1: Fetch execution
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // // Step2: Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // // Step3: Fetch execution claim variables
        // Interface Function signature
        bytes memory functionSignature = executionClaim.functionSignature;
        // Interface Address
        address dappInterface = executionClaim.dappInterface;
        // Get the executionClaimOwner before burning
        address executionClaimOwner = ownerOf(_executionClaimId);

        // Step4: Determine usedGasPrice used to calculate the final executor payout
        // If tx Gas Price is higher than gelatoMaxGasPrice, use gelatoMaxGasPrice
        uint usedGasPrice;
        tx.gasprice > gelatoMaxGasPrice ? usedGasPrice = gelatoMaxGasPrice : usedGasPrice = tx.gasprice;

        // Step5: Check if Interface has sufficient balance on core
        // Interface requires enough balance to payout exectutor
        require(gelatoMaxGasPrice.mul(usedGasPrice) >= interfaceBalances[dappInterface], "Interface does not have enough balance in core to cover gelatoMaxGas");

        // Step6: Call Interface
        // ******* Gelato Interface Call *******
        (bool success, bytes memory data) = dappInterface.call(functionSignature);
        // ******* Gelato Interface Call END *******

        // Step7: Burn & delete
        // Burn the executed executionClaim
        _burn(_executionClaimId);

        // Delete the ExecutionClaim struct
        delete executionClaims[_executionClaimId];
        // ******** EFFECTS END ****

        // Step8: Calc executor payout
        // How much gas we have left in this tx
        uint256 endGas = gasleft();
        // Calaculate how much gas we used up in this function
        uint256 totalGasUsed = startGas.sub(endGas).add(gasOverhead);
        // Calculate Total Cost
        uint256 totalCost = totalGasUsed.mul(usedGasPrice);
        // Calculate Executor Payout (including a fee set by GelatoCore.sol)
        // @🐮 .add not necessaryy as we set the numbers and they wont overflow
        uint256 executorPayout= totalCost.mul(100 + gelatoExecutionMargin).div(100);

        // Log the costs of execution
        emit LogExecutionMetrics(totalGasUsed, usedGasPrice, executorPayout);

        // // Step9: Conduct the payout to the executor
        // Transfer the prepaid fee to the executor as reward
        msg.sender.transfer(executorPayout);

        // Emit event now before deletion of struct
        emit LogClaimExecutedBurnedAndDeleted(executionClaim.dappInterface,
                                              msg.sender,  // executor
                                              executionClaimOwner,
                                              _executionClaimId,
                                              executorPayout
        );
        // Success
        return (success, data);
    }
    // **************************** execute() END ***************************

    // **************************** Core Updateability ******************************

    // Set the global max gas price an executor can receive in the gelato system
    function updateGelatoMaxGasPrice(uint256 _newGelatoMaxGasPrice)
        public
        onlyOwner
    {
        gelatoMaxGasPrice = _newGelatoMaxGasPrice;
    }

    // Set the global fee an executor can receive in the gelato system
    function updateGelatoExecutionMargin(uint256 _newgelatoExecutionMargin)
        public
        onlyOwner
    {
        gelatoExecutionMargin = _newgelatoExecutionMargin;
    }

    // @Dev: we can separate Governance fns into a base contract and inherit from it
    // Updating the gelatoGasPrice - this is called by the Core Execution Service oracle
    function updateGelatoGasPrice(uint256 _gelatoGasPrice)
        external
        onlyOwner
        returns(bool)
    {
        gelatoGasPrice = _gelatoGasPrice;

        emit LogGelatoGasPriceUpdate(gelatoGasPrice);

        return true;
    }
    // **************************** Core Updateability END ******************************

    // **************************** Interface Interactions ******************************

    // Enable interfaces to add a balance to Gelato to pay for transaction executions
    function addBalance(address _dappInterface)
        public
        payable
    {
        require(msg.value > 0, "Msg.value must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[_dappInterface];
        uint256 newBalance = currentInterfaceBalance.add(msg.value);
        interfaceBalances[_dappInterface] = newBalance;
        emit LogInterfaceBalanceAdded(_dappInterface, newBalance);
    }

    // Enable interfaces to withdraw some of their added balances
    function withdrawBalance(uint256 _withdrawAmount)
        public
    {
        require(_withdrawAmount > 0, "WithdrawAmount must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        require(_withdrawAmount <= currentInterfaceBalance, "WithdrawAmount must be smaller or equal to the interfaces current balance");
        interfaceBalances[msg.sender] = currentInterfaceBalance.sub(_withdrawAmount);
        msg.sender.transfer(_withdrawAmount);
    }

    // **************************** Interface Interactions END ******************************

    // Fallback function needed for arbitrary funding additions to Gelato Core's balance by owner
    function() external payable {
        require(isOwner(),
            "fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }
}


