pragma solidity ^0.5.10;

import './gelato_core_standards/GelatoExecutionClaim.sol';
import './gelato_core_standards/GelatoCoreAccounting.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";

contract GelatoCore is GelatoExecutionClaim,
                       GelatoCoreAccounting
{
    // Unique Token Ids for ERC721 execution Claims
    Counters.Counter private _executionClaimIds;
    // executionClaimIds Getter
    function getCurrentExecutionClaimId()
        public
        view
        returns(uint256 currentId)
    {
        currentId = _executionClaimIds.current();
    }

    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public hashedExecutionClaims;


    constructor(uint256 _minInterfaceBalance,
                uint256 _executorProfit,
                uint256 _executorGasPrice,
                uint256 _defaultGasPriceForInterfaces
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas,
                uint256 _executorGasRefundEstimate,
    )
        GelatoExecutionClaim("gelato", "GTA")
        public
    {
        minInterfaceBalance = _minInterfaceBalance;
        executorProfit = _executorProfit;
        executorGasPrice = _executorGasPrice;
        defaultGasPriceForInterfaces = _defaultGasPriceForInterfaces;
        gasOutsideGasleftChecks = _gasOutsideGasleftChecks;
        gasInsideGasleftChecks = _gasInsideGasleftChecks;
        canExecMaxGas = _canExecMaxGas;
        executorGasRefundEstimate = _executorGasRefundEstimate;
    }

    // ********************* mintExecutionClaim() *********************
    event LogNewExecutionClaimMinted(address indexed dappInterface,
                                     address indexed executionClaimOwner,
                                     uint256 indexed executionClaimId,
                                     address triggerAddress,
                                     bytes triggerPayload,
                                     address actionAddress,
                                     bytes actionPayload,
                                     uint256 actionGasStipend,
                                     bytes32 executionClaimHash
    );

    function mintExecutionClaim(uint256 _executionClaimId,
                                address _executionClaimOwner,
                                address _triggerAddress,
                                bytes calldata _triggerPayload,
                                address _actionAddress,
                                bytes calldata _actionPayload,
                                uint256 _actionGasStipend
    )
        stakedInterface
        external
        payable
        returns(bool)
    {
        // ****** Mint new executionClaim ERC721 token ******
        Counters.increment(_executionClaimIds);
        uint256 executionClaimId = _executionClaimIds.current();
        require(executionClaimId == _executionClaimId,
            "GelatoCore.mintExecutionClaim: _executionClaimId failed"
        );
        _mint(_executionClaimOwner, executionClaimId);
        // ****** Mint new executionClaim ERC721 token END ******

        // Include executionClaimId: avoid hash collisions
        // Exclude _executionClaimOwner: ExecutionClaims are transferable
        // msg.sender == dappInterface
        bytes32 executionClaimHash = keccak256(abi.encodePacked(msg.sender,
                                                                executionClaimId,
                                                                _triggerAddress,
                                                                _triggerPayload,
                                                                _actionAddress,
                                                                _actionPayload,
                                                                _actionGasStipend
        ));
        hashedExecutionClaims[executionClaimId] = executionClaimHash;

        emit LogNewExecutionClaimMinted(_executionClaimOwner,
                                        executionClaimId,
                                        msg.sender,  // dappInterface
                                        _triggerAddress,
                                        _triggerPayload,
                                        _actionAddress,
                                        _actionPayload,
                                        _actionGasStipend,
                                        executionClaimHash
        );

        return true;
    }
    // ********************* mintExecutionClaim() END


    // ********************* EXECUTE FUNCTION SUITE *********************
    // Preconditions for execution
    //  checked by canExecute and returned as an uint256 from interface
    enum PreExecutionCheck {
        IsExecutable,  // All checks passed, the executionClaim can be executed
        TriggerReverted,
        WrongReturnValue, // The Interface returned an error code and not 0 for is executable
        InsufficientInterfaceBalance,
        NonExistantExecutionClaim,  // The claim was never minted or already executed
        WrongCalldata  // The computed execution claim hash was wrong
    }
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
                        uint256 _actionGasStipend,
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
                                                                        _actionGasStipend,
                                                                        _dappInterface,
                                                                        _executionClaimId
        ));

        // Retrieve stored execution claim hash
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];

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
            return (uint256(PreExecutionCheck.NonExistantExecutionClaim), executionClaimOwner);
        }

        // Check if Interface has sufficient balance on core
        // @DEV, fine here, we check that the interface can cover the maximium cost of the tx in the exec func.
        if (interfaceBalances[_dappInterface] < minInterfaceBalance)
        {
            // If insufficient balance, return 3
            return (uint256(PreExecutionCheck.InsufficientInterfaceBalance), executionClaimOwner);
        }
        // **** CHECKS END ****;

        // Conduct static call to trigger. If true, action is ready to be executed
        (bool success,
         bytes memory returndata) = _triggerAddress.staticcall.gas(canExecMaxGas)(_triggerPayload);

        // Check dappInterface return value
        if (!success) {
            return (uint256(PreExecutionCheck.TriggerReverted), executionClaimOwner);
        }
        else
        {
            bool executable = abi.decode(returndata, (bool));
            if (executable) {
                return (uint256(PreExecutionCheck.IsExecutable), executionClaimOwner);
            } else {
                return (uint256(PreExecutionCheck.WrongReturnValue), executionClaimOwner);
            }
        }


    }

    // ************** execute() -> safeExecute() **************
    event LogCanExecuteFailed(address indexed executor,
                              uint256 indexed executionClaimId
    );
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

    function execute(address _triggerAddress,
                     bytes calldata _triggerPayload,
                     address _actionAddress,
                     bytes calldata _actionPayload,
                     uint256 _actionGasStipend,
                     address _dappInterface,
                     uint256 _executionClaimId
    )
        external
        returns (uint256 safeExecuteResult)
    {
        // // Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // 3: Start gas should be equal or greater to the interface maxGas, gas overhead plus maxGases of canExecute and the internal operations of conductAtomicCall
        require(startGas >= getMaxExecutionGasConsumption(_actionGasStipend),
            "GelatoCore.execute: Insufficient gas sent"
        );

        // 4: Interface has sufficient funds  staked to pay for the maximum possible charge
        // We don't yet know how much gas will be used by the recipient, so we make sure there are enough funds to pay
        // If tx Gas Price is higher than executorGasPrice, use executorGasPrice
        uint256 usedGasPrice;
        tx.gasprice > executorGasPrice ? usedGasPrice = executorGasPrice : usedGasPrice = tx.gasprice;

        // Make sure that interfaces have enough funds staked on core for the maximum possible charge.
        require((getMaxExecutionGasConsumption(_actionGasStipend).mul(usedGasPrice)).add(executorProfit) <= interfaceBalances[_dappInterface],
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
                                                                 _actionGasStipend,
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

        // __________________From this point on, this transaction SHOULD not revert nor run out of gas, and the dappInterface will be charged for the actual gas consumed

        // **** EFFECTS 1 ****
        // When re entering, executionHash will be bytes32(0)
        delete hashedExecutionClaims[_executionClaimId];

        // Calls to the interface are performed atomically inside an inner transaction which may revert in case of errors in the interface contract or malicious behaviour such as dappInterfaces withdrawing their
        {

            bytes memory payloadWithSelector = abi.encodeWithSelector(this.safeExecute.selector,
                                                                      _actionAddress,
                                                                      _actionPayload,
                                                                      _actionGasStipend,
                                                                      _executionClaimId,
                                                                      msg.sender
            );

            // Call safeExecute func
            (, bytes memory returnData) = address(this).call(payloadWithSelector);
            safeExecuteResult = abi.decode(returnData, (uint256));
        }

        // **** EFFECTS 2 ****
        // Burn Claim. Should be done here to we done have to store the claim Owner on the interface.
        //  Deleting the struct on the core should suffice, as an exeuctionClaim Token without the associated struct is worthless.
        //  => Discuss
        _burn(_executionClaimId);

        // ******** EFFECTS 2 END

        // Calc executor payout
        // How much gas we have left in this tx
        uint256 executorPayout;
        {
            uint256 endGas = gasleft();
            // Calaculate how much gas we used up in this function. Subtract the certain gas refunds the executor will receive for nullifying values
            // Gas Overhead corresponds to the actions occuring before and after the gasleft() calcs
            // @DEV UPDATE WITH NEW FUNC
            uint256 gasUsedEstimate = startGas.sub(endGas).add(gasOutsideGasleftChecks).sub(executorGasRefundEstimate);
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
    event LogExecuteResult(bool indexed status,
                           address indexed executor,
                           uint256 indexed executionClaimId,
                           uint256 executionGas
    );
    function safeExecute(address _dappInterface,
                         bytes calldata _actionPayload,
                         uint256 _actionGasStipend,
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
        // Current tx gas cost:
        // gelatoDutchX depositAnd sell: 465.597
        (bool executedClaimStatus,) = _dappInterface.call.gas(_actionGasStipend)(_actionPayload); // .gas(_actionGasStipend)
        emit LogExecuteResult(executedClaimStatus, _executor, _executionClaimId, _actionGasStipend);

        // If interface withdrew some balance, revert transaction
        require(interfaceBalances[_dappInterface] >= interfaceBalanceBefore,
            "GelatoCore.safeExecute: Interface withdrew some balance during the transaction"
        );

        // return if .call succeeded or failed
        return executedClaimStatus ? uint256(PostExecutionStatus.Success) : uint256(PostExecutionStatus.Failure);
    }
    // ************** execute() -> safeExecute() END

    function getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        internal
        view
        returns (uint256)
    {
        // Only use .add for last, user inputted value to avoid over - underflow
        return gasOutsideGasleftChecks + canExecMaxGas + gasInsideGasleftChecks.add(_actionGasStipend);
    }
    // ********************* EXECUTE FUNCTION SUITE END


    // ********************* cancelExecutionClaim() *********************
    event LogExecutionClaimCancelled(address indexed dappInterface,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner
    );
    function cancelExecutionClaim(address _triggerAddress,
                                  bytes calldata _triggerPayload,
                                  address _actionAddress,
                                  bytes calldata _actionPayload,
                                  uint256 _actionGasStipend,
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
                                                                        _actionGasStipend,
                                                                        _dappInterface,
                                                                        _executionClaimId
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];

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
        delete hashedExecutionClaims[_executionClaimId];

    }
    // ********************* cancelExecutionClaim() END

}