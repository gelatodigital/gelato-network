pragma solidity ^0.5.10;

import '../0_gelato_standards/0_gelato_core_standards/GelatoExecutionClaim.sol';
import './GelatoCoreAccounting.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";
import '../0_gelato_standards/2_GTA_standards/gelato_action_standards/IGelatoAction.sol';

contract GelatoCore is GelatoExecutionClaim,
                       GelatoCoreAccounting
{
    constructor(uint256 _minStakePerExecutionClaim,
                uint256 _executorProfit,
                uint256 _executorGasPrice,
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas,
                uint256 _executorGasRefundEstimate
    )
        GelatoExecutionClaim("gelato", "GTA")
        public
    {
        minStakePerExecutionClaim = _minStakePerExecutionClaim;
        executorProfit = _executorProfit;
        executorGasPrice = _executorGasPrice;
        gasOutsideGasleftChecks = _gasOutsideGasleftChecks;
        gasInsideGasleftChecks = _gasInsideGasleftChecks;
        canExecMaxGas = _canExecMaxGas;
        executorGasRefundEstimate = _executorGasRefundEstimate;
    }

    function _getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        internal
        view
        returns (uint256)
    {
        return (gasOutsideGasleftChecks
                + gasInsideGasleftChecks
                + canExecMaxGas
                .add(_actionGasStipend)
        );
    }

    // ********************* mintExecutionClaim() *********************
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

    event LogNewExecutionClaimMinted(address indexed GTAI,
                                     uint256 indexed executionClaimId,
                                     address indexed executionClaimOwner,
                                     address triggerAddress,
                                     bytes triggerPayload,
                                     address actionAddress,
                                     bytes actionPayload,
                                     uint256 actionGasStipend,
                                     uint256 executionClaimExpiryDate
    );

    function mintExecutionClaim(address _executionClaimOwner,
                                address _trigger,
                                bytes calldata _triggerPayload,
                                address _action,
                                bytes calldata _specificActionParams,
                                uint256 _executionClaimLifespan
    )
        gtaiBalanceOk
        external
        returns(bool)
    {
        // ______ Mint new executionClaim ERC721 token _____________________
        Counters.increment(_executionClaimIds);
        uint256 executionClaimId = _executionClaimIds.current();
        _mint(_executionClaimOwner, executionClaimId);
        // =============
        // ______ Action Payload encoding __________________________________
        bytes memory actionPayload;
        {
            bytes4 actionSelector = IGelatoAction(_action).actionSelector();
            actionPayload = abi.encodeWithSelector(// Standard Action Params
                                                   actionSelector,
                                                   executionClaimId,
                                                   // Specific Action Params
                                                   _specificActionParams
            );
        }
        // =============
        uint256 actionGasStipend = IGelatoAction(_action).actionGasStipend();
        uint256 executionClaimExpiryDate = now.add(_executionClaimLifespan);
        // Include executionClaimId: avoid hash collisions
        // Exclude _executionClaimOwner: ExecutionClaims are transferable
        bytes32 executionClaimHash
            = keccak256(abi.encodePacked(executionClaimId,
                                         msg.sender, // GTAI
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         actionPayload,
                                         actionGasStipend,
                                         executionClaimExpiryDate
        ));
        hashedExecutionClaims[executionClaimId] = executionClaimHash;
        gtaiExecutionClaimsCounter[msg.sender]
            = gtaiExecutionClaimsCounter[msg.sender].add(1);
        emit LogNewExecutionClaimMinted(msg.sender,  // GTAI
                                        executionClaimId,
                                        _executionClaimOwner,
                                        _trigger,
                                        _triggerPayload,
                                        _action,
                                        actionPayload,
                                        actionGasStipend,
                                        executionClaimExpiryDate
        );
        return true;
    }
    // ********************* mintExecutionClaim() END


    // ********************* EXECUTE FUNCTION SUITE *********************
    //  checked by canExecute and returned as a uint256 from GTAI
    enum CanExecuteCheck {
        ExecutionClaimExpired,
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
                        uint256 _executionClaimId,
                        uint256 _executionClaimExpiryDate
    )
        public
        view
        // 0 as first return value == 'executable'
        returns (uint8)
    {
        // _____________ Static CHECKS __________________________________________
        if (_executionClaimExpiryDate < now) {
            return uint8(CanExecuteCheck.ExecutionClaimExpired);
        }

        // Check if Interface has sufficient balance on core
        ///@dev tx maximum cost check is done inside the execute fn
        if (!gtaiHasSufficientBalance(_GTAI)) {
            return uint8(CanExecuteCheck.InsufficientGTAIBalance);
        }

        // Require execution claim to exist and / or not be burned
        if (ownerOf(_executionClaimId) == address(0)) {
            return uint8(CanExecuteCheck.InvalidExecutionClaim);
        }

        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _GTAI,
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend,
                                         _executionClaimExpiryDate
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        // Check that passed calldata is correct
        if(computedExecutionClaimHash != storedExecutionClaimHash) {
            return uint8(CanExecuteCheck.WrongCalldata);
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
            return uint8(CanExecuteCheck.TriggerReverted);
        } else {
            bool executable = abi.decode(returndata, (bool));
            if (executable) {
                return uint8(CanExecuteCheck.Executable);
            } else {
                return uint8(CanExecuteCheck.NotExecutable);
            }
        }
        // ==============
    }

    // ********************* EXECUTE FUNCTION SUITE *************************
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
                     uint256 _executionClaimId,
                     uint256 _executionClaimExpiryDate

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

        // _______ canExecute() check ______________________________________________
        {
            uint8 canExecuteResult = canExecute(_trigger,
                                                _triggerPayload,
                                                _action,
                                                _actionPayload,
                                                _actionGasStipend,
                                                _GTAI,
                                                _executionClaimId,
                                                _executionClaimExpiryDate
            );
            if (canExecuteResult != uint8(CanExecuteCheck.Executable)) {
                emit LogCanExecuteFailed(_executionClaimId,
                                         msg.sender,
                                         canExecuteResult
                );
                return uint8(ExecutionResult.CanExecuteFailed);
            }
        }
        // ========

        // _________________________________________________________________________
        // From this point on, this transaction SHOULD NOT REVERT, nor run out of gas,
        //  and the GTAI will be charged for a deterministic gas cost

        // **** EFFECTS 1 ****
        // When re-entering, executionHash will be bytes32(0)
        delete hashedExecutionClaims[_executionClaimId];

        // _________  _action.call() _______________________________________________
        {
            (bool success,) = (_action.call
                                      .gas(_actionGasStipend)
                                      (_actionPayload)
            );
            emit LogExecutionResult(_executionClaimId,
                                    success,
                                    msg.sender // executor
            );
            if (success) {
                executionResult = uint8(ExecutionResult.Success);
            } else {
                executionResult = uint8(ExecutionResult.Failure);
            }
        }
        // ========

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
                                                  ownerOf(_executionClaimId),
                                                  _GTAI,
                                                  msg.sender,  // executor
                                                  accountedGasPrice,
                                                  gasUsedEstimate,
                                                  executionCostEstimate,
                                                  executorProfit,
                                                  executorPayout
            );
        }
        // **** EFFECTS 2 ****
        // Burn ExecutionClaim here, still needed inside _action.call()
        _burn(_executionClaimId);
        // Decrement here to prevent re-entrancy withdraw drainage during action.call
        gtaiExecutionClaimsCounter[_GTAI] = gtaiExecutionClaimsCounter[_GTAI].sub(1);
        // Balance Updates (INTERACTIONS)
        gtaiBalances[_GTAI] = gtaiBalances[_GTAI].sub(executorPayout);
        executorBalances[msg.sender] = executorBalances[msg.sender].add(executorPayout);
        // ====
    }
    // ************** execute() END
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
                                  uint256 _actionGasStipend,
                                  uint256 _executionClaimExpiryDate
    )
        external
    {
        address executionClaimOwner = ownerOf(_executionClaimId);
        if (msg.sender != executionClaimOwner) {
            require(_executionClaimExpiryDate <= now,
                "GelatoCore.cancelExecutionClaim: _executionClaimExpiryDate failed"
            );
        }
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _GTAI,
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend,
                                         _executionClaimExpiryDate
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        require(computedExecutionClaimHash != storedExecutionClaimHash,
            "GelatoCore.cancelExecutionClaim: hash compare failed"
        );
        // Forward compatibility with actions that need clean-up:
        require(IGelatoAction(_action).cancel(_executionClaimId, executionClaimOwner),
            "GelatoCore.cancelExecutionClaim: _action.cancel failed"
        );
        _burn(_executionClaimId);
        gtaiExecutionClaimsCounter[_GTAI] = gtaiExecutionClaimsCounter[_GTAI].sub(1);
        delete hashedExecutionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(_executionClaimId,
                                        executionClaimOwner,
                                        _GTAI
        );
    }
    // ********************* cancelExecutionClaim() END

}