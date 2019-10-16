pragma solidity ^0.5.10;
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';

contract GelatoCoreAccounting is Ownable,
                                 ReentrancyGuard
{
    using SafeMath for uint256;

    //_____________ Gelato ExecutionClaim Economics _______________________
    mapping(address => uint256) internal executorPrices;
    mapping(address => uint256) internal userBalances;
    mapping(address => uint256) internal executorBalances;
    uint256 internal executionClaimLifespan;
    //_____________ Constant gas values _____________
    uint256 internal gasOutsideGasleftChecks;
    uint256 internal gasInsideGasleftChecks;
    uint256 internal canExecMaxGas;
    // =========================

    constructor(uint256 _executionClaimLifespan,
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas
    )
        internal
    {
        executionClaimLifespan = _executionClaimLifespan;
        gasOutsideGasleftChecks = _gasOutsideGasleftChecks;
        gasInsideGasleftChecks = _gasInsideGasleftChecks;
        canExecMaxGas = _canExecMaxGas;
    }

    modifier onlyRegisteredExecutor(address _executor) {
        require(executorPrices[_executor] != 0,
            "GelatoCoreAccounting.onlyRegisteredExecutors: failed"
        );
        _;
    }

    // _______ Execution Gas Caps ____________________________________________
    function _getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        internal
        view
        returns(uint256)
    {
        return (gasOutsideGasleftChecks
                + gasInsideGasleftChecks
                + canExecMaxGas
                .add(_actionGasStipend)
        );
    }
    function getMaxExecutionGasConsumption(uint256 _actionGasStipend)
        external
        view
        returns(uint256)
    {
        return _getMaxExecutionGasConsumption(_actionGasStipend);
    }
    // =======

    // _______ Important Data to be included as msg.value for minting __________
    function getMintingDepositPayable(address _action,
                                      address _selectedExecutor
    )
        external
        view
        returns(uint256 mintingDepositPayable)
    {
        uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
        uint256 executionMaxGas = _getMaxExecutionGasConsumption(actionGasStipend);
        mintingDepositPayable = executionMaxGas.mul(executorPrices[_executor]);
    }
    // =======

    // __________ Interface for State Reads ___________________________________
    function getExecutorPrice(address _executor) external view returns(uint256) {
        return executorPrices[_executor];
    }
    function getUserBalance(address _user) external view returns(uint256) {
        return userBalances[_user];
    }
    function getExecutorBalance(address _executor) external view returns(uint256) {
        return executorBalances[_executor];
    }
    function getGasOutsideGasleftChecks() external view returns(uint256) {
        return gasOutsideGasleftChecks;
    }
    function getGasInsideGasleftChecks() external view returns(uint256) {
        return gasInsideGasleftChecks;
    }
    function getCanExecMaxGas() external view returns(uint256) {
        return canExecMaxGas;
    }
    // =========================

    // ____________ Interface for STATE MUTATIONS ________________________________________
    //_____________ Interface for Executor __________
    event LogExecutorPriceUpdated(uint256 executorPrice,
                                  uint256 newExecutorPrice
    );
    function setExecutorPrice(uint256 _newExecutorGasPrice)
        external
    {
        emit LogExecutorPriceUpdated(executorPrice, _newExecutorGasPrice);
        executorPrices[msg.sender] = _newExecutorGasPrice;
    }

    event LogExecutorBalanceWithdrawal(address indexed executor,
                                       uint256 withdrawAmount
    );
    function withdrawExecutorBalance()
        nonReentrant
        external
    {
        // Checks
        uint256 currentExecutorBalance = executorBalances[msg.sender];
        require(currentExecutorBalance > 0,
            "GelatoCoreAccounting.withdrawExecutorBalance: failed"
        );
        // Effects
        executorBalances[msg.sender] = 0;
        // Interaction
        msg.sender.transfer(currentExecutorBalance);
        emit LogExecutorBalanceWithdrawal(msg.sender,
                                          currentExecutorBalance
        );
    }
    // =========


    //_____________ Interface for GelatoCore Owner __________
    event LogExecutionClaimLifespanUpdated(uint256 oldExecutionClaimLifespan,
                                           uint256 newExecutionClaimLifespan
    );
    function setExecutionClaimLifespan(uint256 _newExecutionClaimLifespan)
        onlyOwner
        external
    {
        emit LogExecutionClaimLifespanUpdated(executionClaimLifespan,
                                              _newExecutionClaimLifespan
        );
        executionClaimLifespan = _newExecutionClaimLifespan;
    }

    event LogGasOutsideGasleftChecksUpdated(uint256 gasOutsideGasleftChecks,
                                            uint256 newGasOutsideGasleftChecks
    );
    function setGasOutsideGasleftChecks(uint256 _newGasOutsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasOutsideGasleftChecksUpdated(gasOutsideGasleftChecks,
                                               _newGasOutsideGasleftChecks
        );
        gasOutsideGasleftChecks = _newGasOutsideGasleftChecks;
    }

    event LogGasInsideGasleftChecksUpdated(uint256 gasInsideGasleftChecks,
                                           uint256 newGasInsideGasleftChecks
    );
    function setGasInsideGasleftChecks(uint256 _newGasInsideGasleftChecks)
        onlyOwner
        external
    {
        emit LogGasInsideGasleftChecksUpdated(gasInsideGasleftChecks,
                                              _newGasInsideGasleftChecks
        );
        gasInsideGasleftChecks = _newGasInsideGasleftChecks;
    }

    event LogUpdatedCanExecMaxGas(uint256 canExecMaxGas,
                                  uint256 newcanExecMaxGas
    );
    function setCanExecMaxGas(uint256 _newCanExecMaxGas)
        onlyOwner
        external
    {
        emit LogUpdatedCanExecMaxGas(canExecMaxGas, _newCanExecMaxGas);
        canExecMaxGas = _newCanExecMaxGas;
    }
    // =========================
}

import '../0_gelato_interfaces/0_gelato_core_interfaces/IGelatoCore.sol';
import "@openzeppelin/contracts/drafts/Counters.sol";
import '../0_gelato_interfaces/1_GTA_interfaces/gelato_trigger_interfaces/IGelatoTrigger.sol';

contract GelatoCore is IGelatoCore,
                       GelatoCoreAccounting
{
    constructor(uint256 _executionClaimLifespan,
                uint256 _gasOutsideGasleftChecks,
                uint256 _gasInsideGasleftChecks,
                uint256 _canExecMaxGas
    )
        GelatoCoreAccounting(_executionClaimLifespan,
                             _gasOutsideGasleftChecks,
                             _gasInsideGasleftChecks,
                             _canExecMaxGas
        )
        public
    {}

    // Unique ExecutionClaim Ids
    using Counters for Counters.Counter;
    Counters.Counter private executionClaimIds;
    function getCurrentExecutionClaimId()
        external
        view
        returns(uint256 currentId)
    {
        currentId = executionClaimIds.current();
    }
    // executionClaimId => user
    mapping(uint256 => address) private user;
    function getUser(uint256 _executionClaimId)
        external
        view
        returns(address)
    {
        return user[_executionClaimId];
    }
    // executionClaimId => bytes32 executionClaimHash
    mapping(uint256 => bytes32) private hashedExecutionClaims;
    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        returns(bytes32)
    {
        return hashedExecutionClaims[_executionClaimId];
    }

    event LogNewExecutionClaimMinted(uint256 indexed executionClaimId,
                                     address indexed user,
                                     address indexed selectedExecutor,
                                     address trigger,
                                     bytes triggerPayload,
                                     address action,
                                     bytes actionPayload,
                                     uint256 actionGasStipend,
                                     uint256 executionClaimExpiryDate,
                                     uint256 mintingDeposit
    );
    // $$$$$$$$$$$ mintExecutionClaim() API  $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    function mintExecutionClaim(address _selectedExecutor,
                                address _trigger,
                                bytes calldata _specificTriggerParams,
                                address _action,
                                bytes calldata _specificActionParams
    )
        nonReentrant
        onlyRegisteredExecutors(_selectedExecutor)
        external
        payable
    {
        // ______ Charge Minting Deposit _______________________________________
        uint256 actionGasStipend = IGelatoAction(_action).getActionGasStipend();
        uint256 executionMaxGas = _getMaxExecutionGasConsumption(actionGasStipend);
        uint256 mintingDepositPayable
            = executionMaxGas.mul(executorPrices[_selectedExecutor]);
        require(msg.value == mintingDepositPayable,
            "GelatoCore.mintExecutionClaim: mintingDepositPayable failed"
        );
        userBalances[msg.sender] = userBalances[msg.sender].add(mintingDepositPayable);
        // =============

        // ______ Mint new executionClaim ______________________________________
        Counters.increment(executionClaimIds);
        uint256 executionClaimId = executionClaimIds.current();
        user[executionClaimId] = msg.sender;
        // =============

        // ______ Trigger-Action Payload encoding ______________________________
        bytes memory triggerPayload;
        {
            bytes4 triggerSelector = IGelatoTrigger(_trigger).getTriggerSelector();
            triggerPayload = abi.encodeWithSelector(// Standard Trigger Params
                                                    triggerSelector,
                                                   // Specific Trigger Params
                                                   _specificTriggerParams
            );
        }
        bytes memory actionPayload;
        {
            bytes4 actionSelector = IGelatoAction(_action).getActionSelector();
            actionPayload = abi.encodeWithSelector(// Standard Action Params
                                                   actionSelector,
                                                   executionClaimId,
                                                   // Specific Action Params
                                                   _specificActionParams
            );
        }
        // =============

        // ______ ExecutionClaim Hashing ______________________________________
        uint256 executionClaimExpiryDate = now.add(executionClaimLifespan);
        // Include executionClaimId: avoid hash collisions
        bytes32 executionClaimHash
            = keccak256(abi.encodePacked(executionClaimId,
                                         msg.sender, // User
                                         _selectedExecutor,
                                         _trigger,
                                         triggerPayload,
                                         _action,
                                         actionPayload,
                                         actionGasStipend,
                                         executionClaimExpiryDate,
                                         mintingDepositPayable
        ));
        hashedExecutionClaims[executionClaimId] = executionClaimHash;
        // =============
        emit LogNewExecutionClaimMinted(msg.sender,  // User
                                        executionClaimId,
                                        _selectedExecutor,
                                        _trigger,
                                        triggerPayload,
                                        _action,
                                        actionPayload,
                                        actionGasStipend,
                                        executionClaimExpiryDate,
                                        mintingDepositPayable
        );
    }
    // $$$$$$$$$$$$$$$ mintExecutionClaim() END

    // $$$$$$$$$$$ mintChainedExecutionClaim() API  $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    // user => chainedAction
    mapping(address => address) private paidChainedActions;

    function getPaidChainedAction(uint256 _user)
        external
        view
        returns(address)
    {
        return paidChainedActions[_user];
    }

    modifier onlyPaidChainedAction(address _user) {
        require(paidChainedActions[_user] != address(0),
            "GelatoCore.onlyPaidChainedAction: failed"
        );
        _;
    }

    function mintChainedExecutionClaim(address _user,
                                       address _chainedTrigger,
                                       bytes memory _chainedTriggerPayload,
                                       address _chainedAction,
                                       bytes memory _chainedActionPayload,
                                       uint256 _chainedExecutionClaimLifespan
    )
        onlyPaidChainedAction(_user)
        internal
    {
        require(_mintExecutionClaim(_user,
                                    _chainedTrigger,
                                    _chainedTriggerPayload,
                                    _chainedAction,
                                    _chainedActionPayload,
                                    _chainedExecutionClaimLifespan),
            "GTAIChainedStandardOwnable._activateChainedTA._mintExecutionClaim: fail"
        );
        emit LogChainedActivation(_getCurrentExecutionClaimId(),
                                  _chainedTrigger,
                                  _chainedAction,
                                  msg.sender
        );
    }
    // $$$$$$$$$$$$$$$ mintChainedExecutionClaim() END

    // ********************* EXECUTE FUNCTION SUITE *********************
    //  checked by canExecute and returned as a uint256 from User
    enum CanExecuteCheck {
        WrongCalldata,  // also returns if a not-selected executor calls fn
        NonExistantExecutionClaim,
        ExecutionClaimExpired,
        TriggerReverted,
        NotExecutable,
        Executable
    }

    function _canExecute(address _trigger,
                         bytes memory _triggerPayload,
                         address _action,
                         bytes memory _actionPayload,
                         uint256 _actionGasStipend,
                         address _user,
                         uint256 _executionClaimId,
                         uint256 _executionClaimExpiryDate,
                         uint256 _mintingDeposit
    )
        private
        view
        returns (uint8)
    {
        // _____________ Static CHECKS __________________________________________
        // Compute executionClaimHash from calldata
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _user,
                                         msg.sender,  // selected? executor
                                         _trigger,
                                         _triggerPayload,
                                         _action,
                                         _actionPayload,
                                         _actionGasStipend,
                                         _executionClaimExpiryDate,
                                         _mintingDeposit
        ));
        bytes32 storedExecutionClaimHash = hashedExecutionClaims[_executionClaimId];
        // Check passed calldata and that msg.sender is selected executor
        if(computedExecutionClaimHash != storedExecutionClaimHash) {
            return uint8(CanExecuteCheck.WrongCalldata);
        }
        // Require execution claim to exist and / or not be burned
        if (user[_executionClaimId] == address(0)) {
            return uint8(CanExecuteCheck.NonExistantExecutionClaim);
        }
        if (_executionClaimExpiryDate < now) {
            return uint8(CanExecuteCheck.ExecutionClaimExpired);
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
    // canExecute interface for executors
    function canExecute(address _trigger,
                        bytes calldata _triggerPayload,
                        address _action,
                        bytes calldata _actionPayload,
                        uint256 _actionGasStipend,
                        address _user,
                        uint256 _executionClaimId,
                        uint256 _executionClaimExpiryDate
    )
        external
        view
        returns (uint8)
    {
        return _canExecute(_trigger,
                           _triggerPayload,
                           _action,
                           _actionPayload,
                           _actionGasStipend,
                           _user,
                           _executionClaimId,
                           _executionClaimExpiryDate
        );
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
                                           address indexed user,
                                           address payable indexed executor,
                                           uint256 gasUsedEstimate,
                                           uint256 gasPriceUsed,
                                           uint256 executionCostEstimate,
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
                     address _user,
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
        // _______ canExecute() check ______________________________________________
        {
            uint8 canExecuteResult = _canExecute(_trigger,
                                                 _triggerPayload,
                                                 _action,
                                                 _actionPayload,
                                                 _actionGasStipend,
                                                 _user,
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
        //  and the User will be charged for a deterministic gas cost

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
            uint256 executionCostEstimate = gasUsedEstimate.mul(tx.gasprice);
            executorPayout = executionCostEstimate.add(executorProfit);
            // or % payout: executionCostEstimate.mul(100 + executorProfit).div(100);
            emit LogClaimExecutedBurnedAndDeleted(_executionClaimId,
                                                  user[_executionClaimId],
                                                  _user,
                                                  msg.sender,  // executor
                                                  tx.gasprice,
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
        gtaiExecutionClaimsCounter[_user] = gtaiExecutionClaimsCounter[_user].sub(1);
        // Balance Updates (INTERACTIONS)
        gtaiBalances[_user] = gtaiBalances[_user].sub(executorPayout);
        executorBalances[msg.sender] = executorBalances[msg.sender].add(executorPayout);
        // ====
    }
    // ************** execute() END
    // ********************* EXECUTE FUNCTION SUITE END


    // ********************* cancelExecutionClaim() *********************
    event LogExecutionClaimCancelled(uint256 indexed executionClaimId,
                                     address indexed user,
                                     address indexed User
    );
    function cancelExecutionClaim(uint256 _executionClaimId,
                                  address _user,
                                  address _trigger,
                                  bytes calldata _triggerPayload,
                                  address _action,
                                  bytes calldata _actionPayload,
                                  uint256 _actionGasStipend,
                                  uint256 _executionClaimExpiryDate
    )
        external
    {
        address user = user[_executionClaimId];
        if (msg.sender != user) {
            require(_executionClaimExpiryDate <= now,
                "GelatoCore.cancelExecutionClaim: _executionClaimExpiryDate failed"
            );
        }
        bytes32 computedExecutionClaimHash
            = keccak256(abi.encodePacked(_executionClaimId,
                                         _user,
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
        require(IGelatoAction(_action).cancel(_executionClaimId, user),
            "GelatoCore.cancelExecutionClaim: _action.cancel failed"
        );
        _burn(_executionClaimId);
        gtaiExecutionClaimsCounter[_user] = gtaiExecutionClaimsCounter[_user].sub(1);
        delete hashedExecutionClaims[_executionClaimId];
        emit LogExecutionClaimCancelled(_executionClaimId,
                                        user,
                                        _user
        );
        msg.sender.transfer(executorProfit + cancelIncentive);
    }
    // ********************* cancelExecutionClaim() END

}