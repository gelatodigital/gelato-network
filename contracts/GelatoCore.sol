pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import './base/IcedOut.sol';


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
                                     bytes indexed functionSelector,
                                     address indexed executionClaimOwner
    );
    event LogNewInterfaceListed(address indexed dappInterface, uint256 maxGas);
    event LogInterfaceUnlisted(address indexed dappInterface, uint256 noMaxGas);
    event LogGelatoGasPriceUpdate(uint256 newGelatoGasPrice);
    event LogMaxGasUpdate(address indexed dappInterface, uint256 newMaxGas);
    event LogClaimCancelled(address indexed dappInterface,
                            uint256 indexed executionClaimId,
                            uint256 indexed interfaceOrderId,
                            address payable executionClaimOwner,
                            uint256 gelatoCorePayable
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
    // **************************** Events END **********************************



    // **************************** State Variables **********************************
    // Whitelist of Dapp Interfaces
    mapping(address => bool) private interfaceWhitelist;

    // executionClaimId => ExecutionClaim
    mapping(uint256 => ExecutionClaim) private executionClaims;

    // Balance of interfaces
    mapping(address => uint256) public interfaceBalances;


    //_____________ Gelato Execution Service Business Logic ________________
    // Every GelatoInterface has only 1 execute() function i.e. 1 MaxGas in accordance with the IcedOut standard.
    // MaxGas is set upon interface whitelisting:
    // MaxGas is the maximum worst-case gase usage by an Interface execution function
    // The value of MaxGas should stay constant for an ExecutionClaim, unless e.g. EVM OpCodes are patched
    // dappInterface => maxGas
    mapping(address => uint256) private maxGasByInterface;

    // gelatoGasPrice is continually set by Gelato Core's centralised gelatoGasPrice oracle
    // The value is determined via a mathematical model and off-chain computations
    uint256 private gelatoGasPrice;

    // Gas cost of all relayCall() instructions before first gasleft() and after last gasleft()

    uint256 gasOverhead = 10;

    uint256 gelatoMaxGasPrice = 50;

    uint256 gelatoFee = 5;
    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Service Business Logic END ________________




    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _gelatoGasPrice)
        public
    {
        // Initialise gelatoGasPrice
        gelatoGasPrice = _gelatoGasPrice;
    }
    // **************************** Gelato Core constructor() END *****************************


    // Fallback function needed for arbitrary funding additions to Gelato Core's balance by owner
    function() external payable {
        require(isOwner(),
            "fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }


    // **************************** Modifiers ******************************
    modifier onlyExecutionClaimOwner(uint256 _executionClaimId) {
        require(msg.sender == ownerOf(_executionClaimId),
            "modifier onlyExecutionClaimOwner: msg.sender != ownerOf(executionClaimId)"
        );
        _;
    }

    modifier onlyWhitelistedInterfaces() {
        require(interfaceWhitelist[msg.sender],
            "modifier onlyWhitelistedInterfaces: The calling dappInterface is not whitelisted in Gelato Core"
        );
        _;
    }
    // **************************** Modifiers END ******************************



    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(bytes memory _functionSignature,
                                address _executionClaimOwner
    )
        onlyWhitelistedInterfaces  // msg.sender==dappInterface
        payable
        public
        returns (bool)
    {


        // Step1: Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            _functionSignature
        );

        // ****** Step4: Mint new executionClaim ERC721 token ******
        // Increment the current token id
        Counters.increment(_executionClaimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_executionClaimOwner, executionClaimId);
        // ****** Step4: Mint new executionClaim ERC721 token END ******

        // Step5: ExecutionClaims tracking state variable update
        // ERC721(executionClaimId) => ExecutionClaim(struct)
        executionClaims[executionClaimId] = executionClaim;


        // Step6: Emit event to notify executors that a new sub order was created
        emit LogNewExecutionClaimMinted(msg.sender,  // dappInterface
                                        _functionSignature,
                                        _executionClaimOwner  // prepaidExecutionFee
        );


        // Step7: Return true to caller (dappInterface)
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

    function getInterfaceWhitelist(address _dappInterface)
        public
        view
        returns(bool whitelisted)
    {
        whitelisted = interfaceWhitelist[_dappInterface];
    }

    function getInterfaceMaxGas(address _dappInterface)
        public
        view
        returns(uint256 maxGas)
    {
        maxGas = maxGasByInterface[_dappInterface];
    }

    function getGelatoGasPrice()
        public
        view
        returns(uint256)
    {
        return gelatoGasPrice;
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
    // To get claimOwner we call GelatoCore.ownerOf(executionClaimId)
    function getClaimInterface(uint256 _executionClaimId)
        public
        view
        returns(address)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.dappInterface;
    }

    // function getInterfaceOrderId(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(uint256)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.interfaceOrderId;
    // }

    // function getClaimTokenPair(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(address, address)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return (executionClaim.sellToken, executionClaim.buyToken);
    // }

    // function getClaimSellToken(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(address)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.sellToken;
    // }

    // function getClaimBuyToken(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(address)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.sellToken;
    // }

    // function getClaimSellAmount(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(uint256)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.sellAmount;
    // }

    // function getClaimExecutionTime(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(uint256)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.executionTime;
    // }

    // function getClaimPrepaidFee(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(uint256)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.prepaidExecutionFee;
    // }
    // **************************** ExecutionClaim Getters END ******************************
    // **************************** State Variabls Getters END ******************************


    // UPDATE
    // **************************** Core Updateability ***************************
    // @Dev: we can separate Governance fns into a base contract and inherit from it
    // Updating the gelatoGasPrice - this is called by the Core Execution Service oracle
    function updateGelatoGasPrice(uint256 _gelatoGasPrice)
        onlyOwner
        external
        returns(bool)
    {
        gelatoGasPrice = _gelatoGasPrice;

        emit LogGelatoGasPriceUpdate(gelatoGasPrice);

        return true;
    }


    // Whitelisting new interfaces and setting their MaxGas for each executionClaim type
    function listInterface(address _dappInterface, uint256 _maxGas)
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == false,
            "listInterface: Dapp Interface already whitelisted"
        );

        // Whitelist the dappInterface
        interfaceWhitelist[_dappInterface] = true;

        // Set the maxGas of the interface's Core ExecutionClaim
        maxGasByInterface[_dappInterface] = _maxGas;

        emit LogNewInterfaceListed(_dappInterface, _maxGas);
    }

    // Removing interfaces from the whitelist
    function unlistInterface(address _dappInterface)
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == true,
            "unlistInterface: Dapp Interface is not on the whitelist"
        );

        // Unlist the dappInterface and remove the MaxGas entry
        interfaceWhitelist[_dappInterface] = false;

        // Remove the maxGas entry
        delete maxGasByInterface[_dappInterface];

        emit LogInterfaceUnlisted(_dappInterface, maxGasByInterface[_dappInterface]);
    }


    // Governance function to update the maxGas an interface needs to supply for its executionClaims
    function updateMaxGas(address _dappInterface, uint256 _maxGas)
        onlyOwner
        public
    {
        maxGasByInterface[_dappInterface] = _maxGas;

        emit LogMaxGasUpdate(_dappInterface, _maxGas);
    }
    // **************************** Core Updateability END ******************************

    // **************************** ExecutionClaims Updateability ***************************
    // function cancelExecutionClaim(uint256 _executionClaimId)
    //     onlyExecutionClaimOwner(_executionClaimId)
    //     external
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     // Local variables needed for Checks, Effects -> Interactions pattern
    //     address payable executionClaimOwner = address(uint160(ownerOf(_executionClaimId)));
    //     uint256 refund = executionClaim.prepaidExecutionFee;

    //     // CHECKS: onlyExecutionClaimOwner modifier

    //     // EFFECTS: emit event, then burn and delete the ExecutionClaim struct - possible gas refund to msg.sender?
    //     emit LogClaimCancelled(executionClaim.dappInterface,
    //                            _executionClaimId,
    //                            executionClaim.interfaceOrderId,
    //                            executionClaimOwner,
    //                            refund
    //     );
    //     _burn(_executionClaimId);
    //     delete executionClaims[_executionClaimId];

    //     // INTERACTIONS: Refund the prepaidFee to the ExecutionClaim owner
    //     executionClaimOwner.transfer(refund);
    // }

    // We do not want to make the executionTime, nor the sellAmount, updateable
    //  as this introduces unwanted safety complexity e.g. bad gasPrice estimations.
    // Sellers should cancel and/or place new orders instead.

    // **************************** ExecutionClaims Updateability END ******************************



    // Execute executionClaim
    function execute(uint256 _executionClaimId)
        public
        returns (bool, bytes memory)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // Interface Function signature
        bytes memory functionSignature = executionClaim.functionSignature;

        // Interface Address
        address dappInterface = executionClaim.dappInterface;

        // Get the executionClaimOwner before burning
        address executionClaimOwner = ownerOf(_executionClaimId);

        // If tx Gas Price is higher than gelatoMaxGasPrice, use gelatoMaxGasPrice
        uint usedGasPrice;
        tx.gasprice > gelatoMaxGasPrice ? usedGasPrice = gelatoMaxGasPrice : usedGasPrice = tx.gasprice;

        // Interface requires enough balance to payout exectutor
        require(gelatoMaxGasPrice.mul(usedGasPrice) >= interfaceBalances[dappInterface], "Interface does not have enough balance in core to cover gelatoMaxGas");

        // ******** EFFECTS ********
        // ******* Gelato Interface Call *******
        (bool success, bytes memory data) = dappInterface.call(functionSignature);
        // ******* Gelato Interface Call END *******

        // Burn the executed executionClaim
        _burn(_executionClaimId);

        // Delete the ExecutionClaim struct
        // DEV: check if this delete operation results in a gas refund for the msg.sender/executor
        delete executionClaims[_executionClaimId];
        // ******** EFFECTS END ****

        // How much gas we have left in this tx
        uint256 endGas = gasleft();

        // Calaculate how much gas we used up in this function
        uint256 totalGasUsed = startGas.sub(endGas).add(gasOverhead);

        // Calculate Total Cost
        uint256 totalCost = totalGasUsed.mul(usedGasPrice);

        // Calculate Executor Payout (including a fee set by GelatoCore.sol)
        // @🐮 .add not necessaryy as we set the numbers and they wont overflow
        uint executorPayout= totalCost.mul(100 + gelatoFee).div(100);

        // Log the costs of execution
        emit LogExecutionMetrics(totalGasUsed, usedGasPrice, executorPayout);

        // INTERACTIONS:
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


    // Setters for variables used in execute function

    // Set the global max gas price an executor can receive in the gelato system
    function setGelatoMaxGasPrice(uint256 _newGelatoMaxGasPrice)
        public
        onlyOwner
    {
        gelatoMaxGasPrice = _newGelatoMaxGasPrice;
    }

    // Set the global fee an executor can receive in the gelato system
    function setGelatoFee(uint256 _newGelatoFee)
        public
        onlyOwner
    {
        gelatoFee = _newGelatoFee;
    }

    // Enable interfaces to add a balance to Gelato to pay for transaction executions
    function addBalance()
        public
        payable
    {
        require(msg.value > 0, "Msg.value must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        interfaceBalances[msg.sender] = currentInterfaceBalance.add(msg.value);
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
}


