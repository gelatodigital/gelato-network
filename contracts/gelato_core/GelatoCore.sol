pragma solidity ^0.5.10;

import './gelato_core_standards/GelatoExecutionClaim.sol';
import './gelato_core_standards/GelatoCoreAccounting.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";

contract GelatoCore is GelatoExecutionClaim,
                       GelatoCoreAccounting
{
    // Unique Token Ids for ERC721 execution Claims
    Counters.Counter private _executionClaimIds;

    function getCurrentExecutionClaimId()
        public
        view
        returns(uint256 currentId)
    {
        currentId = _executionClaimIds.current();
    }

    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) public hashedExecutionClaims;


    constructor(uint256 _minGTAIBalance,
                uint256 _executorProfit,
                uint256 _executorGasPrice,
                uint256 _defaultGasPriceForGTAIs
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas,
                uint256 _executorGasRefundEstimate,
    )
        GelatoExecutionClaim("gelato", "GTA")
        public
    {
        minGTAIBalance = _minGTAIBalance;
        executorProfit = _executorProfit;
        executorGasPrice = _executorGasPrice;
        defaultGasPriceForGTAIs = _defaultGasPriceForGTAIs;
        gasOutsideGasleftChecks = _gasOutsideGasleftChecks;
        gasInsideGasleftChecks = _gasInsideGasleftChecks;
        canExecMaxGas = _canExecMaxGas;
        executorGasRefundEstimate = _executorGasRefundEstimate;
    }

    // ********************* mintExecutionClaim() *********************
    event LogNewExecutionClaimMinted(address indexed GTAI,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner,
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
        stakedGTAI
        external
        payable
        returns(bool)
    {
        // ______ Mint new executionClaim ERC721 token _____________________
        Counters.increment(_executionClaimIds);
        uint256 executionClaimId = _executionClaimIds.current();
        require(executionClaimId == _executionClaimId,
            "GelatoCore.mintExecutionClaim: _executionClaimId failed"
        );
        _mint(_executionClaimOwner, executionClaimId);
        // =============

        // Include executionClaimId: avoid hash collisions
        // Exclude _executionClaimOwner: ExecutionClaims are transferable
        bytes32 executionClaimHash = keccak256(abi.encodePacked(msg.sender,  // GTAI
                                                                executionClaimId,
                                                                _triggerAddress,
                                                                _triggerPayload,
                                                                _actionAddress,
                                                                _actionPayload,
                                                                _actionGasStipend
        ));
        hashedExecutionClaims[executionClaimId] = executionClaimHash;

        emit LogNewExecutionClaimMinted(msg.sender,  // GTAI
                                        executionClaimId,
                                        _executionClaimOwner,
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
    //  checked by canExecute and returned as a uint256 from GTAI
    enum PreExecutionCheck {
        InsufficientGTAIBalance,
        NonExistantExecutionClaim,
        WrongCalldata,
        TriggerReverted,
        Executable,
        NotExecutable
    }

    function canExecute(address _GTAI,
                        uint256 _executionClaimId,
                        address _triggerAddress,
                        bytes memory _triggerPayload,
                        address _actionAddress,
                        bytes memory _actionPayload,
                        uint256 _actionGasStipend,
    )
        public
        view
        // 0 as first return value == 'executable'
        returns (uint256, address executionClaimOwner)
    {
        // _____________ Static CHECKS __________________________________________
        // Check if Interface has sufficient balance on core
        ///@dev tx maximum cost check is done inside the execute fn
        if (GTAIBalances[_GTAI] < minGTAIBalance) {
            return (uint256(PreExecutionCheck.InsufficientGTAIBalance),
                    executionClaimOwner
            );
        }

        // Require execution claim to exist and / or not be burned
        executionClaimOwner = ownerOf(_executionClaimId);
        if (executionClaimOwner == address(0)) {
            return (uint256(PreExecutionCheck.NonExistantExecutionClaim),
                    executionClaimOwner
            );
        }

        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash = keccak256(abi.encodePacked(_GTAI,
                                                                        _executionClaimId,
                                                                        _triggerAddress,
                                                                        _triggerPayload,
                                                                        _actionAddress,
                                                                        _actionPayload,
                                                                        _actionGasStipend
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        // Check that passed calldata is correct
        if(computedExecutionClaimHash != storedExecutionClaimHash) {
            return (uint256(PreExecutionCheck.WrongCalldata),
                    executionClaimOwner
            );
        }
        // =========

        // _____________ Dynamic CHECKS __________________________________________
        // Conduct static call to trigger. If true, action is ready to be executed
        (bool success,
         bytes memory returndata) = _triggerAddress.staticcall
                                                   .gas(canExecMaxGas)
                                                   (_triggerPayload)
        ; // staticcall end

        // Check GTAI return value
        if (!success) {
            return (uint256(PreExecutionCheck.TriggerReverted),
                    executionClaimOwner
            );
        } else {
            bool executable = abi.decode(returndata, (bool));
            if (executable) {
                return (uint256(PreExecutionCheck.Executable),
                        executionClaimOwner
                );
            } else {
                return (uint256(PreExecutionCheck.NotExecutable),
                        executionClaimOwner
                );
            }
        }
        // ==============
    }

    // ************** execute() -> safeExecute() **************
    event LogCanExecuteFailed(address indexed executor,
                              uint256 indexed executionClaimId
    );
    event LogClaimExecutedBurnedAndDeleted(address indexed GTAI,
                                           uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner,
                                           address payable executor,
                                           uint256 executorPayout,
                                           uint256 executorProfit,
                                           uint256 gasUsedEstimate,
                                           uint256 usedGasPrice,
                                           uint256 executionCostEstimate
    );

    enum PostExecutionStatus {
        Success,
        Failure,
        InterfaceBalanceChanged
    }

    function execute(address _triggerAddress,
                     bytes calldata _triggerPayload,
                     address _actionAddress,
                     bytes calldata _actionPayload,
                     uint256 _actionGasStipend,
                     address _GTAI,
                     uint256 _executionClaimId
    )
        external
        returns (uint256 safeExecuteResult)
    {
        // // Calculate start GAS, set by the executor.
        uint256 startGas = gasleft();

        // 3: Start gas should be equal or greater to the GTAI maxGas, gas overhead plus maxGases of canExecute and the internal operations of conductAtomicCall
        require(startGas >= getMaxExecutionGasConsumption(_actionGasStipend),
            "GelatoCore.execute: Insufficient gas sent"
        );

        // 4: Interface has sufficient funds  staked to pay for the maximum possible charge
        // We don't yet know how much gas will be used by the recipient, so we make sure there are enough funds to pay
        // If tx Gas Price is higher than executorGasPrice, use executorGasPrice
        uint256 usedGasPrice;
        tx.gasprice > executorGasPrice ? usedGasPrice = executorGasPrice : usedGasPrice = tx.gasprice;

        // Make sure that GTAIs have enough funds staked on core for the maximum possible charge.
        require((getMaxExecutionGasConsumption(_actionGasStipend).mul(usedGasPrice)).add(executorProfit) <= GTAIBalances[_GTAI],
            "GelatoCore.execute: Insufficient GTAI balance on gelato core"
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
                                                                 _GTAI,
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

        // __________________From this point on, this transaction SHOULD not revert nor run out of gas, and the GTAI will be charged for the actual gas consumed

        // **** EFFECTS 1 ****
        // When re entering, executionHash will be bytes32(0)
        delete hashedExecutionClaims[_executionClaimId];

        // Calls to the GTAI are performed atomically inside an inner transaction which may revert in case of errors in the GTAI contract or malicious behaviour such as GTAIs withdrawing their
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
        // Burn Claim. Should be done here to we done have to store the claim Owner on the GTAI.
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
            emit LogClaimExecutedBurnedAndDeleted(_GTAI,
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

        // Reduce GTAI balance by executorPayout
        GTAIBalances[_GTAI] = GTAIBalances[_GTAI].sub(executorPayout);

        // Increase executor balance by executorPayout
        executorBalances[msg.sender] = executorBalances[msg.sender].add(executorPayout);
    }

    // To protect from GTAIBalance drain re-entrancy attack
    event LogExecuteResult(bool indexed status,
                           address indexed executor,
                           uint256 indexed executionClaimId,
                           uint256 executionGas
    );
    function safeExecute(address _GTAI,
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
        uint256 GTAIBalanceBefore = GTAIBalances[_GTAI];

        // Interactions
        // Current tx gas cost:
        // gelatoDutchX depositAnd sell: 465.597
        (bool executedClaimStatus,) = _GTAI.call.gas(_actionGasStipend)(_actionPayload); // .gas(_actionGasStipend)
        emit LogExecuteResult(executedClaimStatus, _executor, _executionClaimId, _actionGasStipend);

        // If GTAI withdrew some balance, revert transaction
        require(GTAIBalances[_GTAI] >= GTAIBalanceBefore,
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
    event LogExecutionClaimCancelled(address indexed GTAI,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner
    );
    function cancelExecutionClaim(address _triggerAddress,
                                  bytes calldata _triggerPayload,
                                  address _actionAddress,
                                  bytes calldata _actionPayload,
                                  uint256 _actionGasStipend,
                                  address _GTAI,
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
                                                                        _GTAI,
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
        // Only the GTAI can cancel the executionClaim
        require(_GTAI == msg.sender);

        // EFFECTS
        emit LogExecutionClaimCancelled(_GTAI,
                                        _executionClaimId,
                                        executionClaimOwner
        );
        _burn(_executionClaimId);
        delete hashedExecutionClaims[_executionClaimId];

    }
    // ********************* cancelExecutionClaim() END

}