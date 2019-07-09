pragma solidity >=0.4.21 <0.6.0;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import './base/SafeTransfer.sol';


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
        bytes32 parentOrderHash;
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
    event LogOrderSizeIncreased(address indexed dappInterface,
                                uint256 indexed executionClaimId,
                                address indexed owner,
                                uint256 orderSize
    );
    event LogNewInterfaceListed(address indexed dappInterface);
    event LogGelatoGasPriceUpdate(uint256 newGasPrice);
    event LogMaxGasUpdate(address indexed dappInterface, uint256 executionClaimType);
    event LogExecutionClaimBurned(address indexed dappInterface,
                                  address indexed owner,
                                  uint256 indexed executionClaimId
    );
    event LogExecutorPayout(address indexed dappInterface,
                            address payable indexed executor,
                            bytes32 indexed parentOrderHash,
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
    // dappInterface => executionClaimType => maxGas
    mapping(address => mapping(uint256 => uint256)) public maxGasOfExecutionClaim;

    // gelatoGasPrice is continually set by Gelato Core's centralised gelatoGasPrice oracle
    // The value is determined via a mathematical model and off-chain computations
    uint256 public gelatoGasPrice;
    // **************************** State Variables END ******************************

    // Function to calculate the prepayment an interface needs to transfer to Gelato Core
    //  for minting a new execution executionClaim
    function _calcPrepaidExecutionFee(uint256 _executionClaimType)
        private
        returns(uint256 prepayment)
    {
        // msg.sender == dappInterface
        uint256 prepayment = maxGasOfExecutionClaim[msg.sender][_executionClaimType].mul(gelatoGasPrice);
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
    function mintExecutionClaim(bytes32 _parentOrderHash,
                                address _claimOwner,
                                address _sellToken,
                                address _buyToken,
                                uint256 _orderSize,
                                uint256 _executionTime,
                                uint256 _executionClaimType
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
        require(msg.value == _calcPrepaidExecutionFee(_executionClaimType_),
            "GelatoCore.mintExecutionClaim: msg.value != _calcPrepaidExecutionFee(_executionClaimType)"
        );

        // Step3: Instantiate executionClaim (in memory)
        ExecutionClaim memory executionClaim = ExecutionClaim(
            msg.sender,  // dappInterface
            _parentOrderHash,
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
                bytes32 parentOrderHash,
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
                executionClaim.parentOrderHash,
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
    function registerInterface(address _dappInterface,
                               uint256 _executionClaimTypes,
                               uint256[] _maxGas
    )
        onlyOwner
        public
    {
        require(interfaceWhitelist[_dappInterface] == address(0),
            "listInterface: Dapp Interface already whitelisted"
        );

        for (uint256 i = 0; i < _executionClaimTypes; i++) {
            // Set each of the executionClaim types maxGas
            maxGasOfExecutionClaim[_dappInterface][i] = _maxGas[i];
        }

        // Whitelist the dappInterface
        interfaceWhitelist[_dappInterface] = true;

        emit LogNewInterfaceListed(_dappInterface);
    }

    // Governance function to update the maxGas an interface needs to supply for its executionClaims
    function updateMaxGasOfExecutionClaim(address _dappInterface,
                                          uint256 _executionClaimType,
                                          uint256 _maxGas
    )
        onlyOwner
        public
    {
        // Set each of the requested executionClaim types execution prepayment
        maxGasOfExecutionClaim[_dappInterface][_executionClaimType] = _maxGas;

        emit LogMaxGasUpdate(_dappInterface);
    }
    // **************************** Core Updateability END ******************************

    // **************************** ExecutionClaims Updateability ***************************
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
                            executionClaimId
        );
    }
    // **************************** burnExecutionClaim() END ***************************



    // **************************** payExecutor() ***************************
    function payExecutor(address payable _executor, uint256 _executionClaimId)
        onlyWhiteListedInterface(msg.sender)  // msg.sender == dappInterface
        external
        returns(bool)
    {
        ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

        // Checks: Only dapp Interfaces should be able to call this function
        require(executionClaim.dappInterface == msg.sender,
            "increaseOrderSize: msg.sender is not the dappInterface to the executionClaim"
        );

        // Effects: Burn the executed executionClaim
        burnExecutionClaim(_executionClaimId);

        // Interactions: transfer ether reward to executor
        _executor.transfer(executionClaim.prepaidExecutionFee);

        // Event emission
        emit LogExecutorPayout(msg.sender,  // dappInterface
                               _executor,
                               executionClaim.parentOrderHash,
                               executionClaim.prepaidExecutionFee  // executorPayout
        );

        // Possibly delete struct:


        return true;
    }
    // **************************** payExecutor() END ***************************

}


