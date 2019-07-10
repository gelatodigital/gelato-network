pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';


contract GelatoCore is Ownable, Claim {

    // Libraries used:
    // using Counters for Counters.Counter;

    // No need to add SafeMath, as we inherit it from ERC721
    // using SafeMath for uint256;

    Counters.Counter private _executionClaimIds;


    // Behind each ExecutionClaim on GelatoCore is an executeSomething()
    //  function on a whitelisted GelatoCore Interface.
    // The maxGas is set per interface executeSomething() function upon whitelisting.
    // The prepaidExecutionFee is calculated dynamically for each ExecutionClaim upon minting,
    //  and needs to be transferred to GelatoCore for an ExecutionClaim to be minted.
    struct ExecutionClaim {
        address dappInterface;
        bool pending;  // covers all: pending (true), complete (false), cancelled (false)
        uint256 parentOrderId;
        address sellToken;
        address buyToken;
        uint256 orderSize;
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
    event LogGelatoGasPriceUpdate(uint256 newGasPrice);
    event LogMaxGasUpdate(address indexed dappInterface);
    event LogExecutionTimeUpdated(address indexed dappInterface,
                                  uint256 indexed executionClaimId,
                                  address indexed owner,
                                  uint256 newExecutionTime
    );
    event LogOrderSizeIncreased(address indexed dappInterface,
                                uint256 indexed executionClaimId,
                                address indexed owner,
                                uint256 newOrderSize
    );
    event LogExecutionClaimBurned(address indexed dappInterface,
                                  address indexed owner,
                                  uint256 indexed executionClaimId
    );
    event LogExecutorPayout(address indexed dappInterface,
                            address payable indexed executor,
                            uint256 indexed parentOrderId,
                            uint256 executorPayout

    );
    // **************************** Events END **********************************



    // **************************** State Variables **********************************
    // Whitelist of Dapp Interfaces
    mapping(address => bool) public interfaceWhitelist;

    // executionClaimId => ExecutionClaim
    mapping(uint256 => ExecutionClaim) public executionClaims;

    // owner => ExecutionClaimIDs[]
    mapping(address => uint256[]) public executionClaimsByOwner;

    //_____________ Gelato Execution Service Business Logic ________________
    // MaxGas is set upon interface whitelisting:
    // MaxGas is the maximum worst-case gase usage by an Interface execution function
    // The value of MaxGas should stay constant for an ExecutionClaim, unless e.g. EVM OpCodes are patched
    // For interfaces where multiple exec fns hide behind one Gelato Core ExecutionClaim e.g. GelatoDutchX
    //  the maxGas is the sum of all the interface's exec fns maxGases.
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
    // Only whitelisted interfaces
    modifier onlyWhitelistedInterfaces(address _dappInterface) {
        require(interfaceWhitelist[_dappInterface],
            "onlyWhitelistedInterfaces: The calling dappInterface is not whitelisted in Gelato Core"
        );
        _;
    }
    // **************************** Modifiers END ******************************



    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(uint256 _parentOrderId,
                                address _claimOwner,
                                address _sellToken,
                                address _buyToken,
                                uint256 _orderSize,
                                uint256 _executionTime
    )
        onlyWhitelistedInterfaces(msg.sender)  // msg.sender==dappInterface
        payable
        public
        returns (bool)
    {
        // Step1.1: Zero value preventions
        require(_claimOwner != address(0), "GelatoCore.mintExecutionClaim: _claimOwner: No zero addresses allowed");
        require(_sellToken != address(0), "GelatoCore.mintExecutionClaim: _sellToken: No zero addresses allowed");
        require(_buyToken != address(0), "GelatoCore.mintExecutionClaim: _buyToken: No zero addresses allowed");
        require(_orderSize != 0, "GelatoCore.mintExecutionClaim: _orderSize cannot be 0");
        // Step1.2: Valid execution Time check
        require(_executionTime >= now, "GelatoCore.mintExecutionClaim: Failed test: _executionTime >= now");

        // Step2: Require that interface transfers the correct execution prepayment
        require(msg.value == calcPrepaidExecutionFee(),  // calc for msg.sender==dappInterface
            "GelatoCore.mintExecutionClaim: msg.value != calcPrepaidExecutionFee() for msg.sender/dappInterface"
        );

        // Step3: Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            true,  // pending
            _parentOrderId,
            _sellToken,
            _buyToken,
            _orderSize,
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
    // **************************** getExecutionClaim() ***************************
    function getExecutionClaim(uint256 _executionClaimId)
        public
        view
        returns(address dappInterface,
                bool pending,
                uint256 parentOrderId,
                address owner,
                address sellToken,
                address buyToken,
                uint256 orderSize,
                uint256 executionTime,
                uint256 prepaidExecutionFee
        )
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        return (executionClaim.dappInterface,
                executionClaim.pending,
                executionClaim.parentOrderId,
                ownerOf(_executionClaimId), // fetches owner of the executionClaim token
                executionClaim.sellToken,
                executionClaim.buyToken,
                executionClaim.orderSize,
                executionClaim.executionTime,
                executionClaim.prepaidExecutionFee
        );
    }
    // **************************** getExecutionClaim() END ******************************



    // UPDATE
    // **************************** Core Updateability ***************************
    // @Dev: we can separate Governance fns into a base contract and inherit from it

    // Whitelisting new interfaces and setting their MaxGas for each executionClaim type
    function registerInterface(address _dappInterface, uint256 _maxGas)
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
    // This function is important for chained claims e.g. DutchX sell and withdraw
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

    // Only increase because decrease would be like Order Cancellation
    // This should only be done by dappInterfaces
    function increaseOrderSize(uint256 _executionClaimId, uint256 _amount)
        external
    {
        ExecutionClaim storage executionClaim = executionClaims[_executionClaimId];

        // Only dapp Interfaces should be able to call this function
        require(executionClaim.dappInterface == msg.sender,
            "increaseOrderSize: msg.sender is not the dappInterface to the executionClaim"
        );

        executionClaim.orderSize.add(_amount);

        emit LogOrderSizeIncreased(executionClaim.dappInterface,
                                   _executionClaimId,
                                   ownerOf(_executionClaimId),
                                   executionClaim.orderSize
        );
    }
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



    // @Dev currently the payExecutor function sets the ExecutionClaim to not-pending (complete)
    //  For a 1-exec-per-claim protocol this makes sense. However for the DutchX specific use
    //   case, this is restrictive, as we can only pay the executor after both the execSubOrder()
    //   AND the execWithdrawal() functions have been executed. This might be fine though.
    // **************************** payExecutor() ***************************
    function payExecutor(address payable _executor, uint256 _executionClaimId)
        onlyWhitelistedInterfaces(msg.sender)  // msg.sender == dappInterface
        external
        returns(bool)
    {
        ExecutionClaim storage executionClaim = executionClaims[_executionClaimId];

        // Checks:
        // ExecutionClaim should be pending
        require(executionClaim.pending, "payExecutor: executionClaim is not pending");

        //Only dapp Interfaces should be able to call this function
        require(executionClaim.dappInterface == msg.sender,
            "payExecutor: msg.sender is not the dappInterface to the executionClaim"
        );

        // Effects:
        // Set the ExecutionClaim to not-pending (completed)
        executionClaim.pending = false;
        // Burn the executed executionClaim
        burnExecutionClaim(_executionClaimId);

        // Interactions: transfer ether reward to executor
        _executor.transfer(executionClaim.prepaidExecutionFee);

        // Event emission
        emit LogExecutorPayout(msg.sender,  // dappInterface
                               _executor,
                               executionClaim.parentOrderId,
                               executionClaim.prepaidExecutionFee  // executorPayout
        );

        // Possibly delete struct:


        return true;
    }
    // **************************** payExecutor() END ***************************

}


