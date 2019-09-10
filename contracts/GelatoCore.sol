pragma solidity ^0.5.10;

// Imports:
import './base/ERC721/Claim.sol';
import './base/Ownable.sol';
import './base/SafeMath.sol';
import './base/IIcedOut.sol';


contract GelatoCore is Ownable, Claim {

    // Libraries inherited from Claim:
    // using Counters for Counters.Counter;

    // Counter for execution Claims
    Counters.Counter private _executionClaimIds;

    // Old Core struct
    // struct ExecutionClaim {
    //     address dappInterface;
    //     bytes payload;
    //     uint256 executionGas;
    // }

    // **************************** Events **********************************
    event LogNewExecutionClaimMinted(address triggerAddress,
                                     bytes triggerPayload,
                                     address actionAddress,
                                     bytes actionPayload,
                                     uint256 actionMaxGas,
                                     address dappInterface,
                                     uint256 executionClaimId,
                                     bytes32 executionClaimHash,
                                     address executionClaimOwner
    );
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
    event LogExecutionMetrics(uint256 indexed totalGasUsed, uint256 indexed usedGasPrice, uint256 indexed executorPayout);

    event LogInterfaceBalanceAdded(address indexed dappInterface, uint256 indexed newBalance);

    event LogminEthBalanceUpdated(uint256 minEthBalance);

    event CanExecuteFailed(address indexed executor, uint256 indexed executionClaimId);
    event ExecuteResult(bool indexed status, address indexed executor, uint256 indexed executionClaimId, uint256 executionGas);
    // DELETE LATER

    event LogGasConsumption(uint256 indexed gasConsumed, uint256 indexed num);
    // **************************** Events END **********************************

    // **************************** State Variables **********************************

    // Gelato Version
    string public version = "0.0.3";

    // Gas values

    // Gas cost of all execute() instructions after endGas => 19633
    // Gas cost to initialize transaction = 21781
    // Sum: 34034
    uint256 constant gasOverhead = 41414;

    // Gas stipends for acceptRelayedCall, preRelayedCall and postRelayedCall
    uint256 constant canExecMaxGas = 50000;

    // Executor min gas refunds
    uint256 constant executorGasRefund = 50000;

    // Cost after first gas left and before last gase left
    uint256 constant inbetweenMaxGas = 100000;

    // Execution claim is exeutable should always return 1
    uint256 constant isNotExecutable = 1;

    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public executionClaims;

    // Balance of interfaces which pay for claim execution
    mapping(address => uint256) public interfaceBalances;

    // Minimum ether balance of interfaces
    uint256 public minEthBalance;

    //_____________ Gelato Execution Service Business Logic ________________
    // gelatoGasPrice is continually set by Gelato Core's centralised gelatoGasPrice oracle
    // The value is determined off-chain
    uint256 public gelatoGasPrice;


    // Max Gas Price executors can receive. E.g. 50000000000 == 50GWEI
    uint256 public gelatoMaxGasPrice;

    // Fees in % paid to executors for their execution. E.g. 5 == 5%
    uint256 public gelatoExecutionMargin;

    // Preconditions for execution, checked by canExecute and returned as an uint256 from interface
    enum PreExecutionCheck {
        IsExecutable,                         // All checks passed, the executionClaim can be executed
        AcceptExecCallReverted,  // The interfaces reverted when calling acceptExecutionRequest
        WrongReturnValue, // The Interface returned an error code and not 0 for is executable
        InsufficientBalance, // The interface has insufficient balance on gelato core
        ClaimDoesNotExist,
        WrongCalldata
    }

    // Preconditions for execution, checked by canExecute and returned as an uint256 from interface
    enum PostExecutionStatus {
        Success, // Interface call succeeded
        Failure,  // Interface call reverted
        InterfaceBalanceChanged  // The transaction was relayed and reverted due to the recipient's balance changing

    }

    // **************************** State Variables END ******************************

    //_____________ Gelato Execution Service Business Logic END ________________

    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _gelatoGasPrice, uint256 _gelatoMaxGasPrice, uint256 _gelatoExecutionMargin)
        public
    {
        // Initialise gelatoGasPrice, gelatoMaxGasPrice & gelatoExecutionMargin
        gelatoGasPrice = _gelatoGasPrice;
        gelatoMaxGasPrice = _gelatoMaxGasPrice;
        // Change to 1 finnex
        gelatoExecutionMargin = _gelatoExecutionMargin;
        minEthBalance = 0.5 ether;
    }
    // **************************** Gelato Core constructor() END *****************************

    // CREATE
    // **************************** mintExecutionClaim() ******************************
    function mintExecutionClaim(address _triggerAddress,
                                bytes calldata _triggerPayload,
                                address _actionAddress,
                                bytes calldata _actionPayload,
                                uint256 _actionMaxGas,
                                address _executionClaimOwner
    )
        payable
        external
        returns (bool)
    {
        // CHECKS
        // All checks are done interface side. If interface sets wrong _payload, its not the core's fault. We could check that the bytes param is not == 0x, but this would require 2 costly keccak calls

        // Only staked interfaces can mint claims
        require(interfaceBalances[msg.sender] >= minEthBalance, "Only interfaces with over 0.5 ether can mint claims");

        // ****** Step2: Mint new executionClaim ERC721 token ******
        // Increment the current token id
        Counters.increment(_executionClaimIds);
        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();

        // Create executionClaimHash (we include executionClaimId to avoid hash collissions). We exclude _executionClaimOwner as this might change over the lifecycle of the executionClaim
        bytes32 executionClaimHash = keccak256(abi.encodePacked(_triggerAddress, _triggerPayload, _actionAddress, _actionPayload, _actionMaxGas, msg.sender, executionClaimId));

        // Mint new ERC721 Token representing one childOrder
        _mint(_executionClaimOwner, executionClaimId);
        // ****** Step4: Mint new executionClaim ERC721 token END ******

        // Step3: ExecutionClaims tracking state variable update
        // ERC721(executionClaimId) => ExecutionClaim(struct)
        executionClaims[executionClaimId] = executionClaimHash;

        // Step4: Emit event to notify executors that a new sub order was created
        emit LogNewExecutionClaimMinted(_triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionMaxGas,
                                        msg.sender,  // dappInterface
                                        executionClaimId,
                                        _executionClaimOwner
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

    function getInterfaceBalance(address _dappInterface)
        public
        view
        returns(uint256)
    {
        return interfaceBalances[_dappInterface];
    }

    // **************************** ExecutionClaim Getters ***************************
    // Getter for all ExecutionClaim fields );

    // Getters for individual Execution Claim fields
    // To get claim interface
    // function getClaimInterface(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(address)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.dappInterface;
    // }

    // // To get claim functionSelector
    // function getClaimPayload(uint256 _executionClaimId)
    //     public
    //     view
    //     returns(bytes memory)
    // {
    //     ExecutionClaim memory executionClaim = executionClaims[_executionClaimId];

    //     return executionClaim.payload;
    // }

    // **************************** ExecutionClaim Getters END ******************************

    // **************************** ExecutionClaim Updates  ******************************

    function cancelExecutionClaim(address _triggerAddress,
                                  bytes calldata _triggerPayload,
                                  address _actionAddress,
                                  bytes calldata _actionPayload,
                                  uint256 _actionMaxGas,
                                  address _dappInterface,
                                  uint256 _executionClaimId)
        external
    {
        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash = keccak256(abi.encodePacked(_triggerAddress, _triggerPayload, _actionAddress, _actionPayload, _actionMaxGas, _dappInterface, _executionClaimId));

        bytes32 storedExecutionClaimHash = executionClaims[_executionClaimId];

        // Check that passed calldata is correct
        require(computedExecutionClaimHash == storedExecutionClaimHash, "Computed execution hash does not equal stored execution hash");

        // Local variables needed for Checks, Effects -> Interactions pattern
        address executionClaimOwner = ownerOf(_executionClaimId);

        // Check that execution claim exists
        require(executionClaimOwner!= address(0));


        // Only the interface can cancel the executionClaim
        require(_dappInterface == msg.sender);


        // EFFECTS: emit event, then burn and delete the ExecutionClaim struct - possible gas refund to msg.sender?
        emit LogClaimCancelled(_dappInterface,
                               _executionClaimId,
                               executionClaimOwner
        );

        _burn(_executionClaimId);

    }

    // **************************** ExecutionClaim Updates END ******************************

    // Function for executors to verify that execution claim is executable
    // Must return 0 as first return value in order to be seen as 'executable' by executor nodes
    // @DEV MUST BE VIEW
    function canExecute(address _triggerAddress,
                        bytes memory _triggerPayload,
                        address _actionAddress,
                        bytes memory _actionPayload,
                        uint256 _actionMaxGas,
                        address _dappInterface,
                        uint256 _executionClaimId)
        public
        view
        returns (uint256, address, bytes memory, uint256, address)
    {
         // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash = keccak256(abi.encodePacked(_triggerAddress, _triggerPayload, _actionAddress, _actionPayload, _actionMaxGas, _dappInterface, _executionClaimId));

        bytes32 storedExecutionClaimHash = executionClaims[_executionClaimId];

        address executionClaimOwner = ownerOf(_executionClaimId);

        // APPLY 4 checks
        // Check that passed calldata is correct
        if(computedExecutionClaimHash != storedExecutionClaimHash)
        {
            return (uint256(PreExecutionCheck.WrongCalldata), executionClaimOwner);
        }

        // Require execution claim to exist and / or not be burned
        if (executionClaimOwner == address(0))
        {
            return (uint256(PreExecutionCheck.ClaimDoesNotExist), executionClaimOwner);
        }

        // **** CHECKS ****
        // Check if Interface has sufficient balance on core
        // @DEV, Lets change to maxPossibleCharge calcs like in GSN
        if (interfaceBalances[_dappInterface] < minEthBalance)
        {
            // If insufficient balance, return 3
            return (uint256(PreExecutionCheck.InsufficientBalance), executionClaimOwner);
        }
        // **** CHECKS END ****;

        // Call 'acceptExecutionRequest' in interface contract
        (bool success, bytes memory returndata) = _triggerAddress.staticcall.gas(canExecMaxGas)(_triggerPayload);


        // Check dappInterface return value
        if (!success) {
            // Return 1 in case of error
            return (uint256(PreExecutionCheck.AcceptExecCallReverted), executionClaimOwner);
        }
        else
        {
            // Decode return value from interface
            uint256 status;
            (status, ) = abi.decode(returndata, (uint256, bytes));
            // Decoded returndata should return 0 for the executor to deem execution claim executable
            if (status == uint256(PreExecutionCheck.IsExecutable))
            {
                return (status, executionClaimOwner);
            }
            // If not 0, return 2 (internal error code)
            else
            {
                return (uint256(PreExecutionCheck.WrongReturnValue), executionClaimOwner);
            }

        }

    }

    // Execute executionClaim
    function execute(address _triggerAddress,
                     bytes calldata _triggerPayload,
                     address _actionAddress,
                     bytes calldata _actionPayload,
                     uint256 _actionMaxGas,
                     address _dappInterface,
                     uint256 _executionClaimId)
        external
        returns (uint256)
    {
        // // Step1: Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // 3: Start gas should be equal or greater to the interface maxGas, gas overhead plus maxGases of canExecute and the internal operations of conductAtomicCall
        require(startGas >= getMaxGasValue(_actionMaxGas), "Insufficient gas sent");

        // 4: Interface has sufficient funds  staked to pay for the maximum possible charge
        // We don't yet know how much gas will be used by the recipient, so we make sure there are enough funds to pay
        // If tx Gas Price is higher than gelatoMaxGasPrice, use gelatoMaxGasPrice
        uint256 usedGasPrice;
        tx.gasprice > gelatoMaxGasPrice ? usedGasPrice = gelatoMaxGasPrice : usedGasPrice = tx.gasprice;

        // for the maximum possible charge.
        require((getMaxGasValue(_actionMaxGas).mul(usedGasPrice)).add(gelatoExecutionMargin) <= interfaceBalances[_dappInterface], "Insufficient interface balance on gelato core");


        // 1: Exeutor must be registered and have stake // OR permissionless

        // 2: Gas price should be smaller than this number

        // Check if function is executable & copy state variables to memory
        // We now verify the legitimacy of the transaction (it must be signed by the sender, and not be replayed),
        // and that the recpient will accept to be charged by it.
        // address dappInterface;
        // bytes memory payload;
        // uint256 executionGas;
        address executionClaimOwner;
        {
            uint256 canExecuteResult;
            (canExecuteResult, executionClaimOwner) = canExecute(_triggerAddress,
                                                                 _triggerPayload,
                                                                 _actionAddress,
                                                                 _actionPayload,
                                                                 _actionMaxGas,
                                                                 _dappInterface,
                                                                 _executionClaimId);
            // if canExecuteResult is not equal 0, we return 1 or 2, based on the received preExecutionCheck value;
            if (canExecuteResult != 0) {
                emit CanExecuteFailed(msg.sender, _executionClaimId);
                // Change to returning error message instead of reverting
                revert("canExec func did not return 0");
                // return canExecuteResult;
            }
        }

        // !!! From this point on, this transaction SHOULD not revert nor run out of gas, and the recipient will be charged
        // for the gas spent.

        // **** EFFECTS ****
        // @DEV MAYBE ADD LATER; PROBABLY NOT FOR ONE STATE VARIABLE Delete the ExecutionClaim struct
        // delete executionClaims[_executionClaimId];
        // ******** EFFECTS END ****

        // Calls to the interface are performed atomically inside an inner transaction which may revert in case of
        // errors in the interface contract or malicious behaviour. In either case (revert or regular execution) the return data encodes the
        // RelayCallStatus value.

        uint256 atomicCallStatus;
        {

            bytes memory payloadWithSelector = abi.encodeWithSelector(this.conductAtmoicCall.selector, _actionAddress, _actionPayload, _actionMaxGas, _executionClaimId, msg.sender);

            // Call conductAtomicCall func
            (, bytes memory returnData) = address(this).call(payloadWithSelector);
            atomicCallStatus = abi.decode(returnData, (uint256));

        }

        // **** EFFECTS 2 ****
        // Burn Claim. Should be done here to we done have to store the claim Owner on the interface. Deleting the struct on the core should suffice, as an exeuctionClaim Token without the associated struct is worthless. => Discuss
        _burn(_executionClaimId);

        // ******** EFFECTS 2 END ****

        // Step8: Calc executor payout
        // How much gas we have left in this tx
        uint256 executorPayout;
        {
            uint256 endGas = gasleft();
            // Calaculate how much gas we used up in this function. Subtract the certain gas refunds the executor will receive for nullifying values
            // Gas Overhead corresponds to the actions occuring before and after the gasleft() calcs
            uint256 totalGasUsed = startGas.sub(endGas).add(gasOverhead).sub(executorGasRefund);
            // Calculate Total Cost
            uint256 totalCost = totalGasUsed.mul(usedGasPrice);
            // Calculate Executor Payout (including a fee set by GelatoCore.sol)
            // uint256 executorPayout= totalCost.mul(100 + gelatoExecutionMargin).div(100);
            executorPayout = totalCost.add(gelatoExecutionMargin);

            // Log the costs of execution
            emit LogExecutionMetrics(totalGasUsed, usedGasPrice, executorPayout);
        }

        // Effects 2: Reduce interface balance by executorPayout
        interfaceBalances[_dappInterface] = interfaceBalances[_dappInterface].sub(executorPayout);

        // // Step9: Conduct the payout to the executor
        // Transfer the prepaid fee to the executor as reward
        // @DEV change to withdraw pattern
        msg.sender.transfer(executorPayout);

        // Emit event now before deletion of struct
        emit LogClaimExecutedBurnedAndDeleted(_dappInterface,
                                              msg.sender,  // executor
                                              executionClaimOwner,
                                              _executionClaimId,
                                              executorPayout
        );

        // Success
        return atomicCallStatus;
    }


    function conductAtmoicCall(address _dappInterface, bytes calldata _actionPayload, uint256 _actionMaxGas, uint256 _executionClaimId, address _executor)
        external
        returns(uint256)
    {
        require(msg.sender == address(this), "Only Gelato Core can call this function");

        // Interfaces are not allowed to withdraw their balance while an executionClaim is being executed. They can however increase their balance
        uint256 interfaceBalanceBefore = interfaceBalances[_dappInterface];

        // Interactions
        // Step7: Call Interface
        // ******* Gelato Interface Call *******
        // emit LogGasConsumption(gasleft(), 3);
        // Current tx gas cost:
        // gelatoDutchX depositAnd sell: 465.597
        (bool executedClaimStatus,) = _dappInterface.call.gas(_actionMaxGas)(_actionPayload); // .gas(_actionMaxGas)
        emit ExecuteResult(executedClaimStatus, _executor, _executionClaimId, _actionMaxGas);

        // Fetch interface balance post call
        uint256 interfaceBalanceAfter = interfaceBalances[_dappInterface];

        // If interface withdrew some balance, revert transaction
        require(interfaceBalanceAfter >= interfaceBalanceBefore, "Interface withdrew some balance within the transaction");

        // return if .call succeeded or failed
        return executedClaimStatus ? uint256(PostExecutionStatus.Success) : uint256(PostExecutionStatus.Failure);
        // ******* Gelato Interface Call END *******
    }

    function getMaxGasValue(uint256 _actionMaxGas)
        internal
        pure
        returns (uint256)
    {
        // Only use .add for last, user inputted value to avoid over - underflow
        return gasOverhead + inbetweenMaxGas + canExecMaxGas.add(_actionMaxGas);
    }

    // **************************** execute() END ***************************

    // **************************** Core Updateability ******************************

    // Set the global max gas price an executor can receive in the gelato system
    function updateGelatoMaxGasPrice(uint256 _newGelatoMaxGasPrice)
        external
        onlyOwner
    {
        gelatoMaxGasPrice = _newGelatoMaxGasPrice;
    }

    // Set the global fee an executor can receive in the gelato system
    function updateGelatoExecutionMargin(uint256 _newgelatoExecutionMargin)
        external
        onlyOwner
    {
        gelatoExecutionMargin = _newgelatoExecutionMargin;
    }

    // @Dev: we can separate Governance fns into a base contract and inherit from it
    // Updating the gelatoGasPrice - this is called by the Core Execution Service oracle
    function updateGelatoGasPrice(uint256 _gelatoGasPrice)
        external
        onlyOwner
    {
        gelatoGasPrice = _gelatoGasPrice;

        emit LogGelatoGasPriceUpdate(gelatoGasPrice);

    }

    // Updating the min ether balance of interfaces
    function updateMinEthBalance(uint256 _minEthBalance)
        external
        onlyOwner
    {
        minEthBalance = _minEthBalance;

        emit LogminEthBalanceUpdated(_minEthBalance);
    }

    // **************************** Core Updateability END ******************************

    // **************************** Interface Interactions ******************************

    // Enable interfaces to add a balance to Gelato to pay for transaction executions
    function addBalance(address _dappInterface)
        external
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
        external
    {
        require(_withdrawAmount > 0, "WithdrawAmount must be greater than zero");
        uint256 currentInterfaceBalance = interfaceBalances[msg.sender];
        require(_withdrawAmount <= currentInterfaceBalance, "WithdrawAmount must be smaller or equal to the interfaces current balance");
        // Would revert if insufficient balance
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


