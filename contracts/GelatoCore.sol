pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/IGEI0.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';


contract GelatoCore is Ownable, Claim {

    /**
     * @dev Libraries inherited from Claim:
     * using Counters for Counters.Counter;
     */

    Counters.Counter private _executionClaimIds;

    // removed State.complete - instead: delete struct from executionClaims mapping
    // Define the state of an Execution Claim
    enum State {Pending, Cancelled}


    // Behind each ExecutionClaim on GelatoCore is an executeSomething()
    //  function on a whitelisted GelatoCore Interface.
    // The maxGas is set per interface executeSomething() function upon whitelisting.
    // The prepaidExecutionFee is calculated dynamically for each ExecutionClaim upon minting,
    //  and needs to be transferred to GelatoCore for an ExecutionClaim to be minted.

    // Question: make Core handle both timed and price-conditioned ExecutionClaims?
    // then make one struct for TimeExecutionClaim and one for PriceExecutionClaim and
    // give them their respective mint functions.
    struct ExecutionClaim {
        address dappInterface;
        State state; // default to pending
        address sellToken;
        address buyToken;
        uint256 sellAmount;
        uint256 executionTime;
        uint256 prepaidExecutionFee;
    }

    // **************************** Events **********************************
    event LogNewExecutionClaimMinted(address indexed dappInterface,
                                     address indexed owner,
                                     uint256 indexed executionClaimId,
                                     uint256 prepaidExecutionFee
    );
    event LogNewInterfaceListed(address indexed dappInterface);
    event LogInterfaceUnlisted(address indexed dappInterface);
    event LogGelatoGasPriceUpdate(uint256 newGasPrice);
    event LogMaxGasUpdate(address indexed dappInterface);
    event LogExecutionTimeUpdated(address indexed dappInterface,
                                  uint256 indexed executionClaimId,
                                  address indexed owner,
                                  uint256 newExecutionTime
    );
    event LogSellAmountIncreased(address indexed dappInterface,
                                uint256 indexed executionClaimId,
                                address indexed owner,
                                uint256 newSellAmount
    );
    event LogExecutionClaimBurned(address indexed dappInterface,
                                  address indexed owner,
                                  uint256 indexed executionClaimId
    );
    event LogClaimExecuted(address indexed dappInterface,
                           address payable indexed executor,
                           uint256 indexed executionClaimId,
                           uint256 executorPayout

    );
    event LogClaimCancelled(address indexed dappInterface,
                            uint256 indexed executionClaimId,
                            address payable indexed claimOwner,
                            uint256 sellAmount
    );
    // **************************** Events END **********************************



    // **************************** State Variables **********************************
    // Whitelist of Dapp Interfaces
    mapping(address => bool) public interfaceWhitelist;

    // executionClaimId => ExecutionClaim
    mapping(uint256 => ExecutionClaim) public executionClaims;


    //_____________ Gelato Execution Service Business Logic ________________
    // Every GelatoInterface has only 1 execute() function i.e. 1 MaxGas in accordance with the IGEI0 standard.
    // MaxGas is set upon interface whitelisting:
    // MaxGas is the maximum worst-case gase usage by an Interface execution function
    // The value of MaxGas should stay constant for an ExecutionClaim, unless e.g. EVM OpCodes are patched
    // dappInterface => maxGas
    mapping(address => uint256) public maxGasByInterface;

    // gelatoGasPrice is continually set by Gelato Core's centralised gelatoGasPrice oracle
    // The value is determined via a mathematical model and off-chain computations
    uint256 public gelatoGasPrice;
    // **************************** State Variables END ******************************

    // Function to calculate the prepayment an interface needs to transfer to Gelato Core
    //  for minting a new execution executionClaim
    function calcPrepaidExecutionFee()
        public
        view
        returns(uint256 prepayment)
    {
        // msg.sender == dappInterface
        prepayment = maxGasByInterface[msg.sender].mul(gelatoGasPrice);
    }
    //_____________ Gelato Execution Service Business Logic END ________________




    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _gelatoGasPrice)
        public
    {
        // Initialise gelatoGasPrice
        gelatoGasPrice = _gelatoGasPrice;
    }
    // **************************** Gelato Core constructor() END *****************************



    // **************************** Modifiers ******************************
    modifier onlyPendingExecutionClaims(uint256 _executionClaimId) {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        require(executionClaim.state == State.Pending,
            "modifier onlyPendingExecutionClaims: executionClaim.state != State.Pending"
        );
        _;
    }

    modifier onlyWhitelistedInterfaces() {
        require(interfaceWhitelist[msg.sender],
            "onlyWhitelistedInterfaces: The calling dappInterface is not whitelisted in Gelato Core"
        );
        _;
    }
    // **************************** Modifiers END ******************************



    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(address _claimOwner,
                                address _sellToken,
                                address _buyToken,
                                uint256 _sellAmount,
                                uint256 _executionTime
    )
        onlyWhitelistedInterfaces  // msg.sender==dappInterface
        payable
        public
        returns (bool)
    {
        // Step1.1: Zero value preventions
        require(_claimOwner != address(0), "GelatoCore.mintExecutionClaim: _claimOwner: No zero addresses allowed");
        require(_sellToken != address(0), "GelatoCore.mintExecutionClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintExecutionClaim: _buyToken: No zero addresses allowed");
        require(_sellAmount != 0, "GelatoCore.mintExecutionClaim: _sellAmount cannot be 0");
        // Step1.2: Valid execution Time check
        require(_executionTime >= now, "GelatoCore.mintExecutionClaim: Failed test: _executionTime >= now");

        // Step2: Require that interface transfers the correct execution prepayment
        require(msg.value == calcPrepaidExecutionFee(),  // calc for msg.sender==dappInterface
            "GelatoCore.mintExecutionClaim: msg.value != calcPrepaidExecutionFee() for msg.sender/dappInterface"
        );

        // Step3: Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            State.Pending,
            _sellToken,
            _buyToken,
            _sellAmount,
            _executionTime,
            msg.value  // prepaidExecutionFee
        );


        // ****** Step4: Mint new executionClaim ERC721 token ******
        // Increment the current token id
        Counters.increment(_executionClaimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();
        // Mint new ERC721 Token representing one childOrder
        _mint(_claimOwner, executionClaimId);
        // ****** Step4: Mint new executionClaim ERC721 token END ******


        // Step5: ExecutionClaims tracking state variable update
        // ERC721(executionClaimId) => ExecutionClaim(struct)
        executionClaims[executionClaimId] = executionClaim;
        // Trader => ERC721s(executionClaimIds)
        executionClaimsByOwner[_claimOwner].push(executionClaimId);


        // Step6: Emit event to notify executors that a new sub order was created
        emit LogNewExecutionClaimMinted(msg.sender,  // dappInterface
                                        _claimOwner,
                                        executionClaimId,
                                        msg.value
        );


        // Step7: Return true to caller (dappInterface)
        return true;
    }
    // **************************** mintExecutionClaim() END ******************************



    // READ
    // **************************** ExecutionClaim Getters ***************************
    // Getter for all ExecutionClaim fields
    function getExecutionClaim(uint256 _executionClaimId)
        public
        view
        returns(address claimOwner,
                address dappInterface,
                uint8 state,
                address sellToken,
                address buyToken,
                uint256 sellAmount,
                uint256 executionTime,
                uint256 prepaidExecutionFee
        )
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return (ownerOf(_executionClaimId), // fetches owner of the executionClaim token
                executionClaim.dappInterface,
                uint8(executionClaim.state),
                executionClaim.sellToken,
                executionClaim.buyToken,
                executionClaim.sellAmount,
                executionClaim.executionTime,
                executionClaim.prepaidExecutionFee
        );
    }

    // Getters for individual Execution Claim fields
    // To get claimOwner we call GelatoCore.ownerOf(executionClaimId)
    function getClaimInterface(uint256 _executionClaimId)
        public
        view
        returns(address dappInterface)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.dappInterface;
    }

    function getClaimState(uint256 _executionClaimId)
        public
        view
        returns(uint8 state)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return uint8(executionClaim.state);
    }

    function getClaimTokenPair(uint256 _executionClaimId)
        public
        view
        returns(address sellToken, address buyToken)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return (executionClaim.sellToken, executionClaim.buyToken);
    }

    function getClaimSellAmount(uint256 _executionClaimId)
        public
        view
        returns(uint256 sellAmount)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.sellAmount;
    }

    function getClaimExecutionTime(uint256 _executionClaimId)
        public
        view
        returns(uint256 executionTime)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.executionTime;
    }

    function getClaimPrepaidFee(uint256 _executionClaimId)
        public
        view
        returns(uint256 prepaidExecutionFee)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return executionClaim.prepaidExecutionFee;
    }
    // **************************** ExecutionClaim Getters END ******************************



    // UPDATE
    // **************************** Core Updateability ***************************
    // @Dev: we can separate Governance fns into a base contract and inherit from it

    // Whitelisting new interfaces and setting their MaxGas for each executionClaim type
    function listInterface(address _dappInterface, uint256 _maxGas)
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == false,
            "listInterface: Dapp Interface already whitelisted"
        );

        // Set the maxGas of the interface's Core ExecutionClaim
        maxGasByInterface[_dappInterface] = _maxGas;

        // Whitelist the dappInterface
        interfaceWhitelist[_dappInterface] = true;

        emit LogNewInterfaceListed(_dappInterface);
    }

    // Removing interfaces from the whitelist
    function unlistInterface(address _dappInterface)
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == true,
            "unlistInterface: Dapp Interface is not on the whitelist"
        );

        // Whitelist the dappInterface
        interfaceWhitelist[_dappInterface] = false;

        emit LogInterfaceUnlisted(_dappInterface);
    }

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

    // Governance function to update the maxGas an interface needs to supply for its executionClaims
    function updateMaxGasOfExecutionClaim(address _dappInterface, uint256 _maxGas)
        onlyOwner
        public
    {
        maxGasByInterface[_dappInterface] = _maxGas;

        emit LogMaxGasUpdate(_dappInterface);
    }
    // **************************** Core Updateability END ******************************

    // **************************** ExecutionClaims Updateability ***************************
    function cancelExecutionClaim(uint256 _executionClaimId)
        onlyPendingExecutionClaims(_executionClaimId)
        external
    {
        ExecutionClaim storage executionClaim = executionClaims[_executionClaimId];

        // Casting non-payable address to payable
        address payable owner = address(uint160(ownerOf(_executionClaimId)));

        executionClaim.state = State.Cancelled;

        // Refund fee
        owner.transfer(executionClaim.prepaidExecutionFee);

        emit LogClaimCancelled(executionClaim.dappInterface,
                                _executionClaimId,
                                ownerOf(_executionClaimId),
                                executionClaim.sellAmount
        );
    }

    // Updating (increasing/decreasing) the execution time
    function updateExecutionTime(uint256 _executionClaimId, uint256 _executionTime)
        external
    {
        require(now <= _executionTime,
            "updateExecutionTime: now not <= executionTime"
        );

        ExecutionClaim storage executionClaim = executionClaims[_executionClaimId];

        // Only dapp Interfaces should be able to call this function
        require(executionClaim.dappInterface == msg.sender,
            "updateExecutionTime: msg.sender is not the dappInterface to the executionClaim"

        );

        executionClaim.executionTime = _executionTime;

        emit LogExecutionTimeUpdated(executionClaim.dappInterface,
                                     _executionClaimId,
                                     ownerOf(_executionClaimId),
                                     executionClaim.executionTime
        );
    }

    // We do not want to make the sellAmount updateable as this introduces
    //  unwanted safety complexity. Sellers should cancel or place new orders instead.

    // **************************** ExecutionClaims Updateability END ******************************



    // DELETE
    // **************************** burnExecutionClaim() ***************************
    function burnExecutionClaim(uint256 _executionClaimId)
        private
    {
        _burn(_executionClaimId);
        emit LogExecutionClaimBurned(msg.sender,  // msg.sender == interface
                                     ownerOf(_executionClaimId),
                                     _executionClaimId
        );

    }
    // **************************** burnExecutionClaim() END ***************************



    // This function calls the IGEI0 defined execute(executionClaimId) function
    //  that each Gelato IGEI0 compliant interface must have in its namespace.
    // Upon successfull execution of the interface-specific execution logic
    //  that is coded into their interface.execute() fns, this Core function
    // makes a call to payExecutor().
    // @notice: the interfaces need to be audited well here for bugs, so that
    //  there are no gasCosts incurred by executors on GelatoCore, due to
    //  buggy interface.execute() code that leads to sunk gas costs reverts.
    // **************************** execute() ***************************
    function execute(uint256 _executionClaimId)
        onlyPendingExecutionClaims(_executionClaimId)
        public
        returns (bool)
    {
        // @Dev: removed State.complete - instead: delete struct from executionClaims mapping
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // Local variable needed for Checks - Effects - Interactions pattern
        uint256 executorPayout = executionClaim.prepaidExecutionFee;

        // CHECKS:
        // Anyone can be an executor and call this function
        // ExecutionClaim should be pending: this is checked by onlyPending modifier

        // ******** EFFECTS ********
        // @Dev: if this doesnt work use function selectors instead
        // Execute the interface-specific execution logic, handled outside the Core on the Interface level.
        // All interfaces execute() functions are audited and thus no explicit checks are needed
        // ******* Gelato Interface Call *******
        IGEI0(executionClaim.dappInterface).execute(_executionClaimId);
        // ******* Gelato Interface Call END *******

        // Burn the executed executionClaim
        burnExecutionClaim(_executionClaimId);

        // Delete the ExecutionClaim struct (that's why we need local executorPayout)
        // @dev: check if this delete operation results in a gas refund for the msg.sender/executor
        delete executionClaims[_executionClaimId];
        // ******** EFFECTS END ****

        // INTERACTIONS:
        // Transfer the prepaid fee to the executor as reward
        msg.sender.transfer(executorPayout);

        // Emit event
        emit LogClaimExecuted(executionClaim.dappInterface,
                              msg.sender,  // executor
                              _executionClaimId,
                              executionClaim.prepaidExecutionFee  // executorPayout
        );

        // Success
        return true;
    }
    // **************************** execute() END ***************************

}


