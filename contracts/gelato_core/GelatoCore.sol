pragma solidity ^0.5.10;

import './gelato_core_standards/GelatoExecutionClaim.sol';
import './gelato_core_standards/GelatoCoreAccounting.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";
import '../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';

contract GelatoCore is GelatoExecutionClaim,
                       GelatoCoreAccounting
{
    // Unique Token Ids for ERC721 execution Claims
    Counters.Counter private _executionClaimIds;

    function getCurrentExecutionClaimId()
        external
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
                uint256 _defaultGasPriceForGTAIs,
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas,
                uint256 _executorGasRefundEstimate
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

    function mintExecutionClaim(address _executionClaimOwner,
                                address _trigger,
                                bytes calldata _triggerPayload,
                                address _action,
                                bytes calldata _actionPayload
    )
        onlyStakedGTAI
        external
        payable
        returns(bool)
    {



        // ______ Mint new executionClaim ERC721 token _____________________
        Counters.increment(_executionClaimIds);
        uint256 executionClaimId = _executionClaimIds.current();
        _mint(_executionClaimOwner, executionClaimId);
        // =============
        uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
        // Include executionClaimId: avoid hash collisions
        // Exclude _executionClaimOwner: ExecutionClaims are transferable
        bytes32 executionClaimHash = keccak256(abi.encodePacked(executionClaimId,
                                                                msg.sender, // GTAI
                                                                _trigger,
                                                                _triggerPayload,
                                                                _action,
                                                                _actionPayload,
                                                                actionGasStipend
        ));
        hashedExecutionClaims[executionClaimId] = executionClaimHash;
        emit LogNewExecutionClaimMinted(msg.sender,  // GTAI
                                        executionClaimId,
                                        _executionClaimOwner,
                                        _trigger,
                                        _triggerPayload,
                                        _action,
                                        _actionPayload,
                                        actionGasStipend,
                                        executionClaimHash
        );
        return true;
    }
    // ********************* mintExecutionClaim() END


    // ********************* EXECUTE FUNCTION SUITE *********************
    //  checked by canExecute and returned as a uint256 from GTAI
    enum CanExecuteCheck {
        InsufficientGTAIBalance,
        InvalidExecutionClaim,
        WrongCalldata,
        TriggerReverted,
        Executable,
        NotExecutable
    }

    function canExecute(address _trigger,
                        bytes memory _triggerPayload,
                        address _action,
                        bytes memory _actionPayload,
                        uint256 _actionGasStipend,
                        address _GTAI,
                        uint256 _executionClaimId
    )
        public
        view
        // 0 as first return value == 'executable'
        returns (uint8, address executionClaimOwner)
    {
        executionClaimOwner = ownerOf(_executionClaimId);

        // _____________ Static CHECKS __________________________________________
        // Check if Interface has sufficient balance on core
        ///@dev tx maximum cost check is done inside the execute fn
        if (gtaiBalances[_GTAI] < minGTAIBalance) {
            return (uint8(CanExecuteCheck.InsufficientGTAIBalance),
                          executionClaimOwner
            );
        }

        // Require execution claim to exist and / or not be burned
        if (executionClaimOwner == address(0)) {
            return (uint8(CanExecuteCheck.InvalidExecutionClaim),
                    executionClaimOwner
            );
        }

        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _GTAI,
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        // Check that passed calldata is correct
        if(computedExecutionClaimHash != storedExecutionClaimHash) {
            return (uint8(CanExecuteCheck.WrongCalldata),
                    executionClaimOwner
            );
        }
        // =========

        // _____________ Dynamic CHECKS __________________________________________
        // Call to trigger view function (returns(bool))
        (bool success,
         bytes memory returndata) = (_trigger.staticcall
                                             .gas(canExecMaxGas)
                                             (_triggerPayload)
        );
        if (!success) {
            return (uint8(CanExecuteCheck.TriggerReverted),
                    executionClaimOwner
            );
        } else {
            bool executable = abi.decode(returndata, (bool));
            if (executable) {
                return (uint8(CanExecuteCheck.Executable),
                        executionClaimOwner
                );
            } else {
                return (uint8(CanExecuteCheck.NotExecutable),
                       executionClaimOwner
                );
            }
        }
        // ==============
    }

    // ********************* EXECUTE FUNCTION SUITE *************************
    function _getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        internal
        view
        returns (uint256)
    {
        // Only use .add for last, user inputted value to avoid over - underflow
        return (gasOutsideGasleftChecks
                + canExecMaxGas
                + gasInsideGasleftChecks
                .add(_actionGasStipend)
        );
    }

    event LogCanExecuteFailed(uint256 indexed executionClaimId,
                              address payable indexed executor,
                              uint256 indexed canExecuteResult
    );
    event LogExecutionResult(uint256 indexed executionClaimId,
                             bool indexed success,
                             address payable indexed executor
    );
    event LogClaimExecutedBurnedAndDeleted(uint256 indexed executionClaimId,
                                           address indexed executionClaimOwner,
                                           address indexed GTAI,
                                           address payable executor,
                                           uint256 accountedGasPrice,
                                           uint256 gasUsedEstimate,
                                           uint256 executionCostEstimate,
                                           uint256 executorProfit,
                                           uint256 executorPayout
    );

    enum ExecutionResult {
        Success,
        Failure,
        CanExecuteFailed
    }

    function execute(address _trigger,
                     bytes calldata _triggerPayload,
                     address _action,
                     bytes calldata _actionPayload,
                     uint256 _actionGasStipend,
                     address _GTAI,
                     uint256 _executionClaimId

    )
        nonReentrant
        external
        returns(uint8 executionResult)
    {
        // Ensure that executor sends enough gas for the execution
        uint256 startGas = gasleft();
        require(startGas >= _getMaxExecutionGasConsumption(_actionGasStipend),
            "GelatoCore.execute: Insufficient gas sent"
        );

        // Determine the gasPrice to be used in executorPayout calculation
        uint256 accountedGasPrice;
        if (tx.gasprice > executorGasPrice) {
            accountedGasPrice = executorGasPrice;
        } else {
            accountedGasPrice = tx.gasprice;
        }

        // Ensure that GTAI has enough funds staked, to pay executor
        require((_getMaxExecutionGasConsumption(_actionGasStipend)
                    .mul(accountedGasPrice)
                    .add(executorProfit)) <= gtaiBalances[_GTAI],
            "GelatoCore.execute: Insufficient GTAI balance on gelato core"
        );

        // Call canExecute to verify that transaction can be executed
        address executionClaimOwner;
        {
            uint8 canExecuteResult;
            (canExecuteResult,
             executionClaimOwner) = canExecute(_trigger,
                                               _triggerPayload,
                                               _action,
                                               _actionPayload,
                                               _actionGasStipend,
                                               _GTAI,
                                               _executionClaimId
            );
            if (canExecuteResult != uint8(CanExecuteCheck.Executable)) {
                emit LogCanExecuteFailed(_executionClaimId,
                                         msg.sender,
                                         canExecuteResult
                );
                return uint8(ExecutionResult.CanExecuteFailed);
            }
        }

        // _________________________________________________________________________
        // From this point on, this transaction SHOULD NOT REVERT, nor run out of gas,
        //  and the GTAI will be charged for a deterministic gas cost

        // **** EFFECTS 1 ****
        // When re-entering, executionHash will be bytes32(0)
        delete hashedExecutionClaims[_executionClaimId];

        // _________ safeExecute()_______________________________________________
        {
            bytes memory safeExecutePayload
                = abi.encodeWithSelector(this.safeExecute.selector,
                                         _GTAI,
                                         msg.sender,
                                         _executionClaimId,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend
            );
            // call safeExecute()
            (, bytes memory returnData) = address(this).call(safeExecutePayload);
            executionResult = abi.decode(returnData, (uint8));
        }
        // ========

        // **** EFFECTS 2 ****
        // Burn ExecutionClaim here, still needed inside previous interaction
        _burn(_executionClaimId);
        // ====

        // Calc executor payout
        uint256 executorPayout;
        {
            uint256 endGas = gasleft();
            // Calaculate how much gas we used up in this function.
            // executorGasRefundEstimate: factor in gas refunded via `delete` ops
            // @DEV UPDATE WITH NEW FUNC
            uint256 gasUsedEstimate = (startGas.sub(endGas)
                                               .add(gasOutsideGasleftChecks)
                                               .sub(executorGasRefundEstimate)
            );
            uint256 executionCostEstimate = gasUsedEstimate.mul(accountedGasPrice);
            executorPayout = executionCostEstimate.add(executorProfit);
            // or % payout: executionCostEstimate.mul(100 + executorProfit).div(100);
            emit LogClaimExecutedBurnedAndDeleted(_executionClaimId,
                                                  executionClaimOwner,
                                                  _GTAI,
                                                  msg.sender,  // executor
                                                  accountedGasPrice,
                                                  gasUsedEstimate,
                                                  executionCostEstimate,
                                                  executorProfit,
                                                  executorPayout
            );
        }
        // Balance Updates
        gtaiBalances[_GTAI] = gtaiBalances[_GTAI].sub(executorPayout);
        executorBalances[msg.sender] = executorBalances[msg.sender].add(executorPayout);
    }

    function safeExecute(uint256 _executionClaimId,
                         address _GTAI,
                         address payable _executor,
                         address _action,
                         bytes calldata _actionPayload,
                         uint256 _actionGasStipend
    )
        external
        returns(uint8)
    {
        require(msg.sender == address(this),
            "GelatoCore.safeExecute: Only Gelato Core can call this function"
        );

        // Interfaces are not allowed to withdraw their balance while an
        //  executionClaim is being executed.
        uint256 gtaiBalanceBefore = gtaiBalances[_GTAI];

        // Interactions
        (bool success,) = _action.call
                                 .gas(_actionGasStipend)
                                 (abi.encode(_executionClaimId, _actionPayload)
        );
        emit LogExecutionResult(_executionClaimId,
                                success,
                                _executor
        );

        // If GTAI withdrew some balance, revert transaction
        require(gtaiBalances[_GTAI] >= gtaiBalanceBefore,
            "GelatoCore.safeExecute: forbidden interim gtaiBalance withdrawal"
        );

        // return whether _action.call succeeded or failed
        if (success) {
            return uint8(ExecutionResult.Success);
        } else {
            return uint8(ExecutionResult.Failure);
        }
    }
    // ************** execute() -> safeExecute() END
    // ********************* EXECUTE FUNCTION SUITE END


    // ********************* cancelExecutionClaim() *********************
    event LogExecutionClaimCancelled(uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner,
                                     address indexed GTAI
    );
    function cancelExecutionClaim(uint256 _executionClaimId,
                                  address _GTAI,
                                  address _trigger,
                                  bytes calldata _triggerPayload,
                                  address _action,
                                  bytes calldata _actionPayload,
                                  uint256 _actionGasStipend
    )
        external
    {
        address executionClaimOwner = ownerOf(_executionClaimId);
        require(msg.sender == executionClaimOwner,
            "GelatoCore.cancelExecutionClaim: msg.sender not owner"
        );
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _GTAI,
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        require(computedExecutionClaimHash == storedExecutionClaimHash,
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );
        _burn(_executionClaimId);
        delete hashedExecutionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(_executionClaimId,
                                        executionClaimOwner,
                                        _GTAI
        );
    }
    // ********************* cancelExecutionClaim() END

}