pragma solidity ^0.5.10;

// Imports:
import './base/GelatoClaim.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoCore is GelatoClaim, Ownable {
    // Libraries inherited from Claim:
    // using Counters for Counters.Counter;
    // using SafeMath for uint256;

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
    // Update
    // - Gelato Params
    event LogMinInterfaceBalanceUpdated(uint256 minInterfaceBalance, uint256 newMinInterfaceBalance);
    event LogExecutorProfitUpdated(uint256 executorProfit, uint256 newExecutorProfit);
    event LogExecutorGasPriceUpdated(uint256 executorGasPrice, uint256 newExecutorGasPrice);
    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas, uint256 newcanExecMaxGas);
    event LogUpdatedFixedGasConsumptionInBetween(uint256 execFNGas2, uint256 newExecFNGas2);
    event LogUpdatedExecutorGasRefund(uint256 execFNRefundedGas, uint256 newExecFNRefundedGas);
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
    // Execute Suite
    event LogCanExecuteFailed(address indexed executor, uint256 indexed executionClaimId);
    event LogClaimExecutedBurnedAndDeleted(address indexed dappInterface,
                                           uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner,
                                           address payable executor,
                                           uint256 executorPayout,
                                           uint256 executorProfit,
                                           uint256 gasUsedEstimate,
                                           uint256 usedGasPrice,
                                           uint256 executionCostEstimate
    );
    event LogExecuteResult(bool indexed status,
                           address indexed executor,
                           uint256 indexed executionClaimId,
                           uint256 executionGas
    );
    // Delete
    event LogExecutionClaimCancelled(address indexed dappInterface,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner
    );

    // DELETE LATER
    event LogGasConsumption(uint256 indexed gasConsumed, uint256 indexed num);
    // **************************** Events END **********************************

    // **************************** State Variables **********************************
    // Gelato Version
    string public version = "0.0.3";

    // Counter for execution Claims
    Counters.Counter private _executionClaimIds;
    // Gas values



    // Execution claim is exeutable should always return 1
    uint256 constant isNotExecutable = 1;

    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public executionClaims;

    // Balance of interfaces which pay for claim execution
    mapping(address => uint256) public interfaceBalances;

    // Balance of executors for execution executionClaims
    mapping(address => uint256) public executorBalances;

    // The minimum balance for an interface to mint/execute claims
    uint256 public minInterfaceBalance;

    //_____________ Gelato Execution Economics ________________
    // @DEV: every parameter should have its own UPDATE function

    // Fixed profit to be expected for executors for each executed transaction
    uint256 public executorProfit;

    // The gas price that executors can max select
    uint256 public executorGasPrice;

    uint256 public recommendedGasPriceForInterfaces;

    //_____________ Gelato Execution Economics END ________________

    //_____________ Constant gas values _____________

    // Gas consumption of execute() before and after gaslefts()
    // @DEV UPDATE with new redesign
    uint256 public uncountedGasConsumption;

    // Cost after first gasleft() and before last gasleft()
    uint256 public fixedGasConsumptionInBetween;

    // Max gas the canExec function is allowed to consume. Triggers have to adhere to this value
    uint256 public canExecMaxGas;

    // Minimium gas refunds executors can expect from nullying several values in execute(). To be subtracted from the total reward for executors
    uint256 public executorGasRefund;

    //_____________ Constant gas values END _____________


    // **************************** State Variables END ******************************


    // **************************** Gelato Core constructor() ******************************
    constructor(uint256 _minInterfaceBalance,
                uint256 _executorProfit,
                uint256 _executorGasPrice,
                uint256 _canExecMaxGas,
                uint256 _uncountedGasConsumption,
                uint256 _fixedGasConsumptionInBetween,
                uint256 _executorGasRefund,
                uint256 _recommendedGasPriceForInterfaces
    )
        GelatoClaim("gelato", "GEL")  // ERC721Metadata constructor(name, symbol)
        public
    {

        minInterfaceBalance = _minInterfaceBalance;
        executorProfit = _executorProfit;
        executorGasPrice = _executorGasPrice;
        canExecMaxGas = _canExecMaxGas;
        uncountedGasConsumption = _uncountedGasConsumption;
        fixedGasConsumptionInBetween = _fixedGasConsumptionInBetween;
        executorGasRefund = _executorGasRefund;
        recommendedGasPriceForInterfaces = _recommendedGasPriceForInterfaces;
    }
    // **************************** Gelato Core constructor() END *****************************

    // Fallback function needed for arbitrary funding additions to Gelato Core's balance by owner
    // @DEV: possibly no need, as sent Ether reverts are built-in features of new EVM contracts
    function() external payable {
        require(isOwner(),
            "GelatoCore.fallback function: only the owner should send ether to Gelato Core without selecting a payable function."
        );
    }

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
    {
        // CHECKS
        // All checks are done interface side. If interface sets wrong _payload, its not the core's fault.
        // We could check that the bytes param is not == 0x, but this would require 2 costly keccak calls

        // Only staked interfaces can mint claims
        require(interfaceBalances[msg.sender] >= minInterfaceBalance,
            "Only interfaces that have a balance greater than minInterfaceBalance can mint new execution claims"
        );

        // ****** Mint new executionClaim ERC721 token ******

        // Increment the current token id
        Counters.increment(_executionClaimIds);

        // Get a new, unique token id for the newly minted ERC721
        uint256 executionClaimId = _executionClaimIds.current();

        // Create executionClaimHash (we include executionClaimId to avoid hash collisions).
        // We exclude _executionClaimOwner as this might change over the lifecycle of the executionClaim
        bytes32 executionClaimHash = keccak256(abi.encodePacked(_triggerAddress,
                                                                _triggerPayload,
                                                                _actionAddress,
                                                                _actionPayload,
                                                                _actionMaxGas,
                                                                msg.sender,  // dappInterface
                                                                executionClaimId
        ));

        // Mint new ERC721 Token representing one childOrder
        _mint(_executionClaimOwner, executionClaimId);

        // ****** Mint new executionClaim ERC721 token END ******

        // ExecutionClaims tracking state variable update
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
                                        executionClaimHash,
                                        _executionClaimOwner
        );
    }
    // **************************** mintExecutionClaim() END ******************************

    // READ
    // **************************** ExecutionClaim Getters ***************************
    function getExecutionClaimHash(uint256 _executionClaimId)
        public
        view
        returns(bytes32)
    {
        bytes32 executionClaimHash = executionClaims[_executionClaimId];
        return executionClaimHash;
    }

    // To get executionClaimOwner call ownerOf(executionClaimId)

    function getCurrentExecutionClaimId()
        public
        view
        returns(uint256)
    {
        uint256 currentId = _executionClaimIds.current();
        return currentId;
    }
    // **************************** ExecutionClaim Getters END ***************************

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

    function updateCanExecMaxGas(uint256 _newCanExecMaxGas)
        public
        onlyOwner
    {
        emit LogUpdatedCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }

    function updateUncountedGasConsumption(uint256 _newUncountedGasConsumption)
        public
        onlyOwner
    {
        emit LogUpdatedFixedGasConsumptionInBetween(uncountedGasConsumption, _newUncountedGasConsumption);
        uncountedGasConsumption = _newUncountedGasConsumption;
    }

    function updateFixedGasConsumptionInBetween(uint256 _newFixedGasConsumptionInBetween)
        public
        onlyOwner
    {
        emit LogUpdatedFixedGasConsumptionInBetween(fixedGasConsumptionInBetween, _newFixedGasConsumptionInBetween);
        fixedGasConsumptionInBetween = _newFixedGasConsumptionInBetween;
    }

    // Update gas refund subtracted from executor payout
    function updateExecutorGasRefund(uint256 _newExecutorGasRefund)
        public
        onlyOwner
    {
        emit LogUpdatedExecutorGasRefund(executorGasRefund, _newExecutorGasRefund);
        executorGasRefund = _newExecutorGasRefund;
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

    // Enable interfaces to withdraw some of their added balances
    function withdrawExecutorBalance(uint256 _withdrawAmount)
        external
    {
        // Checks
        require(_withdrawAmount > 0, "WithdrawAmount must be greater than zero");
        uint256 currentExecutorBalance = executorBalances[msg.sender];
        require(_withdrawAmount <= currentExecutorBalance,
            "GelatoCore.withdrawExecutorBalance(): WithdrawAmount must be smaller or equal to the executors current balance"
        );

        // Effects
        executorBalances[msg.sender] = currentExecutorBalance.sub(_withdrawAmount);

        // Interaction
        msg.sender.transfer(_withdrawAmount);
        emit LogInterfaceBalanceWithdrawal(msg.sender,
                                           currentExecutorBalance,
                                           _withdrawAmount,
                                           executorBalances[msg.sender]
        );
    }

    // *** Interface Params Governance END ****
    // **************************** Core Updateability END ******************************


    // **************************** EXECUTE FUNCTION SUITE ******************************
    // Preconditions for execution, checked by canExecute and returned as an uint256 from interface
    enum PreExecutionCheck {
        IsExecutable,                         // All checks passed, the executionClaim can be executed
        TriggerReverted,  // The interfaces reverted when calling acceptExecutionRequest
        WrongReturnValue, // The Interface returned an error code and not 0 for is executable
        InsufficientBalance, // The interface has insufficient balance on gelato core
        ClaimDoesNotExist, // The claim was never minted or already executed
        WrongCalldata // The computed execution claim hash was wrong
    }

    // Preconditions for execution, checked by canExecute and returned as an uint256 from interface
    enum PostExecutionStatus {
        Success, // Interface call succeeded
        Failure,  // Interface call reverted
        InterfaceBalanceChanged  // The transaction was relayed and reverted due to the recipient's balance changing

    }

    // Function for executors to verify that execution claim is executable
    // Must return 0 as first return value in order to be seen as 'executable' by executor nodes
    function canExecute(address _triggerAddress,
                        bytes memory _triggerPayload,
                        address _actionAddress,
                        bytes memory _actionPayload,
                        uint256 _actionMaxGas,
                        address _dappInterface,
                        uint256 _executionClaimId)
        public
        view
        returns (uint256, address executionClaimOwner)
    {
         // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash = keccak256(abi.encodePacked(_triggerAddress,
                                                                        _triggerPayload,
                                                                        _actionAddress,
                                                                        _actionPayload,
                                                                        _actionMaxGas,
                                                                        _dappInterface,
                                                                        _executionClaimId
        ));

        // Retrieve stored execution claim hash
        bytes32 storedExecutionClaimHash = executionClaims[_executionClaimId];

        // Fetch current owner of execution cöao,
        executionClaimOwner = ownerOf(_executionClaimId);

        // **** CHECKS ****

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

        // Check if Interface has sufficient balance on core
        // @DEV, fine here, we check that the interface can cover the maximium cost of the tx in the exec func.
        if (interfaceBalances[_dappInterface] < minInterfaceBalance)
        {
            // If insufficient balance, return 3
            return (uint256(PreExecutionCheck.InsufficientBalance), executionClaimOwner);
        }
        // **** CHECKS END ****;

        // Conduct static call to trigger. If true, action is ready to be executed
        (bool success, bytes memory returndata) = _triggerAddress.staticcall.gas(canExecMaxGas)(_triggerPayload);

        // Check dappInterface return value
        if (!success) {
            // Return 1 in case of error
            return (uint256(PreExecutionCheck.TriggerReverted), executionClaimOwner);
        }
        else
        {
            // Decode return value from interface
            bool executable = abi.decode(returndata, (bool));
            // Decoded returndata should return true for the executor to deem execution claim executable
            if (executable)
            {
                return (uint256(PreExecutionCheck.IsExecutable), executionClaimOwner);
            }
            // If not true, return 2 (internal error code)
            else
            {
                return (uint256(PreExecutionCheck.WrongReturnValue), executionClaimOwner);
            }

        }


    }

    // ************** execute() -> safeExecute() **************
    function execute(address _triggerAddress,
                     bytes calldata _triggerPayload,
                     address _actionAddress,
                     bytes calldata _actionPayload,
                     uint256 _actionMaxGas,
                     address _dappInterface,
                     uint256 _executionClaimId)
        external
        returns (uint256 safeExecuteStatus)
    {
        // // Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // 3: Start gas should be equal or greater to the interface maxGas, gas overhead plus maxGases of canExecute and the internal operations of conductAtomicCall
        require(startGas >= getMaxExecutionGasConsumption(_actionMaxGas),
            "GelatoCore.execute: Insufficient gas sent"
        );

        // 4: Interface has sufficient funds  staked to pay for the maximum possible charge
        // We don't yet know how much gas will be used by the recipient, so we make sure there are enough funds to pay
        // If tx Gas Price is higher than executorGasPrice, use executorGasPrice
        uint256 usedGasPrice;
        tx.gasprice > executorGasPrice ? usedGasPrice = executorGasPrice : usedGasPrice = tx.gasprice;

        // Make sure that interfaces have enough funds staked on core for the maximum possible charge.
        require((getMaxExecutionGasConsumption(_actionMaxGas).mul(usedGasPrice)).add(executorProfit) <= interfaceBalances[_dappInterface],
            "GelatoCore.execute: Insufficient interface balance on gelato core"
        );

        // Call canExecute to verify that transaction can be executed
        address executionClaimOwner;
        {
            uint256 canExecuteResult;
            (canExecuteResult, executionClaimOwner) = canExecute(_triggerAddress,
                                                                                 _triggerPayload,
                                                                                 _actionAddress,
                                                                                 _actionPayload,
                                                                                 _actionMaxGas,
                                                                                 _dappInterface,
                                                                                 _executionClaimId
            );
            // if canExecuteResult is not equal 0, we return 1 or 2, based on the received preExecutionCheck value;
            if (canExecuteResult != 0) {
                emit LogCanExecuteFailed(msg.sender, _executionClaimId);
                // Change to returning error message instead of reverting
                revert("GelatoCore.execute: canExec func did not return 0");
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
        {

            bytes memory payloadWithSelector = abi.encodeWithSelector(this.safeExecute.selector,
                                                                      _actionAddress,
                                                                      _actionPayload,
                                                                      _actionMaxGas,
                                                                      _executionClaimId,
                                                                      msg.sender
            );

            // Call conductAtomicCall func
            (, bytes memory returnData) = address(this).call(payloadWithSelector);
            safeExecuteStatus = abi.decode(returnData, (uint256));
        }

        // **** EFFECTS 2 ****
        // Burn Claim. Should be done here to we done have to store the claim Owner on the interface.
        //  Deleting the struct on the core should suffice, as an exeuctionClaim Token without the associated struct is worthless.
        //  => Discuss
        _burn(_executionClaimId);

        // ******** EFFECTS 2 END ****

        // Calc executor payout
        // How much gas we have left in this tx
        uint256 executorPayout;
        {
            uint256 endGas = gasleft();
            // Calaculate how much gas we used up in this function. Subtract the certain gas refunds the executor will receive for nullifying values
            // Gas Overhead corresponds to the actions occuring before and after the gasleft() calcs
            // @DEV UPDATE WITH NEW FUNC
            uint256 gasUsedEstimate = startGas.sub(endGas).add(uncountedGasConsumption).sub(executorGasRefund);
            // Calculate Total Cost
            uint256 executionCostEstimate = gasUsedEstimate.mul(usedGasPrice);
            // Calculate Executor Payout (including a fee set by GelatoCore.sol)
            // uint256 executorPayout= executionCostEstimate.mul(100 + executorProfit).div(100);
            // @DEV Think about it
            executorPayout = executionCostEstimate.add(executorProfit);

            // Emit event now before deletion of struct
            emit LogClaimExecutedBurnedAndDeleted(_dappInterface,
                                                _executionClaimId,
                                                executionClaimOwner,
                                                msg.sender,  // executor
                                                executorPayout,
                                                executorProfit,
                                                gasUsedEstimate,
                                                usedGasPrice,
                                                executionCostEstimate
            );
        }

        // Reduce interface balance by executorPayout
        interfaceBalances[_dappInterface] = interfaceBalances[_dappInterface].sub(executorPayout);

        // Increase executor balance by executorPayout
        executorBalances[msg.sender] = executorBalances[msg.sender].add(executorPayout);
    }

    // To protect from interfaceBalance drain re-entrancy attack
    function safeExecute(address _dappInterface,
                         bytes calldata _actionPayload,
                         uint256 _actionMaxGas,
                         uint256 _executionClaimId,
                         address _executor
    )
        external
        returns(uint256)
    {
        require(msg.sender == address(this),
            "GelatoCore.safeExecute: Only Gelato Core can call this function"
        );

        // Interfaces are not allowed to withdraw their balance while an executionClaim is being executed. They can however increase their balance
        uint256 interfaceBalanceBefore = interfaceBalances[_dappInterface];

        // Interactions
        // emit LogGasConsumption(gasleft(), 3);
        // Current tx gas cost:
        // gelatoDutchX depositAnd sell: 465.597
        (bool executedClaimStatus,) = _dappInterface.call.gas(_actionMaxGas)(_actionPayload); // .gas(_actionMaxGas)
        emit LogExecuteResult(executedClaimStatus, _executor, _executionClaimId, _actionMaxGas);

        // If interface withdrew some balance, revert transaction
        require(interfaceBalances[_dappInterface] >= interfaceBalanceBefore,
            "GelatoCore.safeExecute: Interface withdrew some balance during the transaction"
        );

        // return if .call succeeded or failed
        return executedClaimStatus ? uint256(PostExecutionStatus.Success) : uint256(PostExecutionStatus.Failure);
    }
    // ************** execute() -> safeExecute() END **************

    function getMaxExecutionGasConsumption(uint256 _actionMaxGas)
        internal
        view
        returns (uint256)
    {
        // Only use .add for last, user inputted value to avoid over - underflow
        return uncountedGasConsumption + canExecMaxGas + fixedGasConsumptionInBetween.add(_actionMaxGas);
    }
    // **************************** EXECUTE FUNCTION SUITE END ******************************

    // **************************** cancelExecutionClaim() ***************************
    function cancelExecutionClaim(address _triggerAddress,
                                  bytes calldata _triggerPayload,
                                  address _actionAddress,
                                  bytes calldata _actionPayload,
                                  uint256 _actionMaxGas,
                                  address _dappInterface,
                                  uint256 _executionClaimId
    )
        external
    {
        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash = keccak256(abi.encodePacked(_triggerAddress,
                                                                        _triggerPayload,
                                                                        _actionAddress,
                                                                        _actionPayload,
                                                                        _actionMaxGas,
                                                                        _dappInterface,
                                                                        _executionClaimId
        ));
        bytes32 storedExecutionClaimHash = executionClaims[_executionClaimId];

        // CHECKS
        require(computedExecutionClaimHash == storedExecutionClaimHash,
            "Computed execution hash does not equal stored execution hash"
        );
        // Local variables needed for Checks, Effects -> Interactions pattern
        address executionClaimOwner = ownerOf(_executionClaimId);
        // Check that execution claim exists
        require(executionClaimOwner != address(0));
        // Only the interface can cancel the executionClaim
        require(_dappInterface == msg.sender);

        // EFFECTS
        emit LogExecutionClaimCancelled(_dappInterface,
                                        _executionClaimId,
                                        executionClaimOwner
        );
        _burn(_executionClaimId);
        delete executionClaims[_executionClaimId];

    }
    // **************************** cancelExecutionClaim() END ***************************

}


