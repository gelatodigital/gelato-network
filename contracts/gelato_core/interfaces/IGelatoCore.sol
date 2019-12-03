pragma solidity ^0.5.13;

import "../GelatoCoreEnums.sol";
import "./IGelatoUserProxy.sol";
import "../../triggers/IGelatoTrigger.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCore - solidity interface of GelatoCore
/// @notice canExecute API and minting, execution, cancellation of ExecutionClaims
/// @dev all the APIs and events are implemented inside GelatoCore
interface IGelatoCore {

    event LogExecutionClaimMinted(
        address indexed selectedExecutor,
        uint256 indexed executionClaimId,
        IGelatoUserProxy indexed userProxy,
        IGelatoTrigger _trigger,
        bytes _triggerPayloadWithSelector,
        uint256 triggerGas,
        IGelatoAction _action,
        bytes _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 minExecutionGas,
        uint256 executionClaimExpiryDate,
        uint256 mintingDeposit
    );

    event LogCanExecuteFailed(
        address payable indexed executor,
        uint256 indexed executionClaimId,
        GelatoCoreEnums.CanExecuteCheck indexed canExecuteResult
    );

    event LogClaimExecutedAndDeleted(
        address payable indexed executor,
        uint256 indexed executionClaimId,
        IGelatoUserProxy userProxy,
        GelatoCoreEnums.ExecutionResult indexed executionResult,
        uint256 gasPriceUsed,
        uint256 executionCostEstimate,
        uint256 executorPayout
    );

    event LogExecutionClaimCancelled(
        uint256 indexed executionClaimId,
        IGelatoUserProxy indexed userProxy,
        address indexed cancelor
    );

    /**
     * @dev API for minting execution claims on gelatoCore
     * @param _selectedExecutor: the registered executor to service this claim
     * @param _trigger: the address of the trigger
     * @param _triggerPayloadWithSelector: the encoded trigger params with function selector
     * @param _action: the address of the action
     * @param _actionPayloadWithSelector: the encoded action params with function selector
     * @notice re-entrancy guard because accounting ops are present inside fn
     * @notice msg.value is a refundable deposit - only a fee if executed
     * @notice minting event split into two, due to stack too deep issue
     */
    function mintExecutionClaim(
        address payable _selectedExecutor,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
        payable;

    /**
     * @dev the API for executors to check whether a claim is executable
     * @param _executionClaimId executors get this from LogExecutionClaimMinted
     * @param _userProxy executors get this from LogExecutionClaimMinted
     * @param _trigger executors get this from LogTriggerActionMinted
     * @param _triggerPayloadWithSelector executors get this from LogTriggerActionMinted
     * @param _actionPayloadWithSelector executors get this from LogExecutionClaimMinted
     * @param _executionMinGas executors get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate executors get this from LogExecutionClaimMinted
     * @param _mintingDeposit executors get this from LogExecutionClaimMinted
     * @return uint8 which converts to one of enum GelatoCoreEnums.CanExecuteCheck values
     * @notice if return value == 6, the claim is executable
     */
    function canExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 _actionConditionsOkGas,
        uint256 _executionMinGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck);


    /**
     * @dev the API executors call when they execute an executionClaim
     * @param _executionClaimId executors get this from LogExecutionClaimMinted
     * @param _userProxy executors get this from LogExecutionClaimMinted
     * @param _trigger executors get this from LogTriggerActionMinted
     * @param _triggerPayloadWithSelector executors get this from LogTriggerActionMinted
     * @param _actionPayloadWithSelector executors get this from LogExecutionClaimMinted
     * @param _action executors get this from LogTriggerActionMinted
     * @param _executionMinGas executors get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate executors get this from LogExecutionClaimMinted
     * @param _mintingDeposit executors get this from LogExecutionClaimMinted
     * @return uint8 which converts to one of enum GelatoCoreEnums.ExecutionResult values
     * @notice if return value == 0, the claim got executed
     * @notice re-entrancy protection due to accounting operations and interactions
     */
    function execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 _executionMinGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult);

    /**
     * @dev API for canceling executionClaims
     * @param _selectedExecutor callers get this from LogExecutionClaimMinted
     * @param _executionClaimId callers get this from LogExecutionClaimMinted
     * @param _userProxy callers get this from LogExecutionClaimMinted
     * @param _trigger callers get this from LogTriggerActionMinted
     * @param _triggerPayloadWithSelector callers get this from LogTriggerActionMinted
     * @param _actionPayloadWithSelector callers get this from LogExecutionClaimMinted
     * @param _executionMinGas callers get this from LogExecutionClaimMinted
     * @param _executionClaimExpiryDate callers get this from LogExecutionClaimMinted
     * @param _mintingDeposit callers get this from LogExecutionClaimMinted
     * @notice re-entrancy protection due to accounting operations and interactions
     * @notice prior to executionClaim expiry, only owner of _userProxy can cancel
        for a refund. Post executionClaim expiry, _selectedExecutor can also cancel,
        for a reward.
     * @notice .sendValue instead of .transfer due to IstanbulHF
     */
    function cancelExecutionClaim(
        address payable _selectedExecutor,
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 _executionMinGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external;

    /// @dev get the current executionClaimId
    /// @return uint256 current executionClaim Id
    function getCurrentExecutionClaimId() external view returns(uint256 currentId);

    /// @dev api to read from the userProxyByExecutionClaimId state variable
    /// @param _executionClaimId z
    /// @return address of the userProxy behind _executionClaimId
    function getUserProxyWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(IGelatoUserProxy);

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address payable);

    /// @dev interface to read from the hashedExecutionClaims state variable
    /// @param _executionClaimId z
    /// @return the bytes32 hash of the executionClaim with _executionClaimId
    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        view
        returns(bytes32);


    // ============= IGelatoUserProxyManager =======================
    event LogCreateUserProxy(IGelatoUserProxy indexed userProxy, address indexed user);
    /// @notice deploys gelato proxy for users that have no proxy yet
    /// @dev This function should be called for users that have nothing deployed yet
    /// @return address of the deployed GelatoUserProxy
    function createUserProxy() external returns(IGelatoUserProxy);

    // ______ State Read APIs __________________
    function getUserCount() external view returns(uint256);
    function getUserOfProxy(IGelatoUserProxy _proxy) external view returns(address payable);
    function isUser(address _user) external view returns(bool);
    function getProxyOfUser(address _user) external view returns(IGelatoUserProxy);
    function isUserProxy(IGelatoUserProxy _userProxy) external view returns(bool);
    function getUsers() external view returns(address payable[] memory);
    function getUserProxies() external view returns(IGelatoUserProxy[] memory);
    // =========================

    // ================== IGelatoCoreAccounting ======================================
    event LogRegisterExecutor(
        address payable indexed executor,
        uint256 executorPrice,
        uint256 executorClaimLifespan
    );

    event LogDeregisterExecutor(address payable indexed executor);

    event LogSetExecutorPrice(uint256 executorPrice, uint256 newExecutorPrice);

    event LogSetExecutorClaimLifespan(
        uint256 executorClaimLifespan,
        uint256 newExecutorClaimLifespan
    );

    event LogWithdrawExecutorBalance(
        address indexed executor,
        uint256 withdrawAmount
    );

    event LogSetMinExecutionClaimLifespan(
        uint256 minExecutionClaimLifespan,
        uint256 newMinExecutionClaimLifespan
    );

    event LogSetGelatoCoreExecGasOverhead(
        uint256 gelatoCoreExecGasOverhead,
        uint256 _newGasOverhead
    );

    event LogSetUserProxyExecGasOverhead(
        uint256 userProxyExecGasOverhead,
        uint256 _newGasOverhead
    );

    /**
     * @dev fn to register as an executorClaimLifespan
     * @param _executorPrice the price factor the executor charges for its services
     * @param _executorClaimLifespan the lifespan of claims minted for this executor
     * @notice while executorPrice could be 0, executorClaimLifespan must be at least
       what the core protocol defines as the minimum (e.g. 10 minutes).
     * @notice NEW
     */
    function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external;

    /**
     * @dev fn to deregister as an executor
     * @notice ideally this fn is called by all executors as soon as they stop
       running their node/business. However, this behavior cannot be enforced.
       Frontends/Minters have to monitor executors' uptime themselves, in order to
       determine which listed executors are alive and have strong service guarantees.
     */
    function deregisterExecutor() external;

    /**
     * @dev fn for executors to configure their pricing of claims minted for them
     * @param _newExecutorGasPrice the new price to be listed for the executor
     * @notice param can be 0 for executors that operate pro bono - caution:
        if executors set their price to 0 then they get nothing, not even gas refunds.
     */
    function setExecutorPrice(uint256 _newExecutorGasPrice) external;

    /**
     * @dev fn for executors to configure the lifespan of claims minted for them
     * @param _newExecutorClaimLifespan the new lifespan to be listed for the executor
     * @notice param cannot be 0 - use deregisterExecutor() to deregister
     */
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;

    /**
     * @dev function for executors to withdraw their ETH on core
     * @notice funds withdrawal => re-entrancy protection.
     * @notice new: we use .sendValue instead of .transfer due to IstanbulHF
     */
    function withdrawExecutorBalance() external;

    /**
     * @dev setter for gelatoCore devs to impose a lower boundary on
       executors' listed claim lifespans, to disallow bad claims
     * @param _newMinExecutionClaimLifespan x
     */
    function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan) external;

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newGasOverhead new calc for gelatoCore.execute overhead gas
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setGelatoCoreExecGasOverhead(uint256 _newGasOverhead) external;

    /**
     * @dev setter for GelatoCore devs to configure the protocol's executionGas calculations
     * @param _newGasOverhead new calc for userProxy.execute overhead gas
     * @notice important for _getMinExecutionGasRequirement and getMintingDepositPayable
     */
    function setUserProxyExecGasOverhead(uint256 _newGasOverhead) external;

    /// @dev get the gelato-wide minimum executionClaim lifespan
    /// @return the minimum executionClaim lifespan for all executors
    function getMinExecutionClaimLifespan() external view returns(uint256);

    /// @dev get an executor's price
    /// @param _executor x
    /// @return uint256 executor's price factor
    function getExecutorPrice(address _executor) external view returns(uint256);

    /// @dev get an executor's executionClaim lifespan
    /// @param _executor x
    /// @return uint256 executor's executionClaim lifespan
    function getExecutorClaimLifespan(address _executor) external view returns(uint256);

    /// @dev get the gelato-internal wei balance of an executor
    /// @param _executor z
    /// @return uint256 wei amount of _executor's gelato-internal deposit
    function getExecutorBalance(address _executor) external view returns(uint256);

    /// @dev getter for gelatoCoreExecGasOverhead state variable
    /// @return uint256 gelatoCoreExecGasOverhead
    function getGelatoCoreExecGasOverhead() external view returns(uint256);

    /// @dev getter for userProxyExecGasOverhead state variable
    /// @return uint256 userProxyExecGasOverhead
    function getUserProxyExecGasOverhead() external view returns(uint256);

    /// @dev getter for internalExecutionGas state variable
    /// @return uint256 internalExecutionGas
    function getTotalExecutionGasOverhead() external view returns(uint256);

    /**
     * @dev get the deposit payable for minting on gelatoCore
     * @param _action the action contract to be executed
     * @param _selectedExecutor the executor that should call the action
     * @return amount of wei that needs to be deposited inside gelato for minting
     * @notice minters (e.g. frontends) should use this API to get the msg.value
       payable to GelatoCore's mintExecutionClaim function.
     */
    function getMintingDepositPayable(address _selectedExecutor, IGelatoAction _action)
        external
        view
        returns(uint256 mintingDepositPayable);

    /// @dev calculates gas requirements based off _actionGasTotal
    /// @param _triggerGas the gas forwared to trigger.staticcall inside gelatoCore.execute
    /// @param _actionGasTotal the gas forwarded with the action call
    /// @return the minimum gas required for calls to gelatoCore.execute()
    function getMinExecutionGas(uint256 _triggerGas, uint256 _actionGasTotal)
        external
        view
        returns(uint256);


    // ==================== GAS TESTING =====================================
    function revertLogGasTriggerCheck(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas
    )
        external
        view
        returns(uint256);

    function revertLogGasActionConditionsCheck(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionConditionsOkGas
    )
        external
        view
        returns(uint256);

    function revertLogGasCanExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 _actionConditionsOkGas,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns(uint256);

    function revertLogGasActionViaGasTestUserProxy(
        IGelatoUserProxy _gasTestUserProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        returns(uint256);

    function revertLogGasTestUserProxyExecute(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        returns(uint256);

    function revertLogGasExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGasTotal,
        uint256 _minExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(uint256);
}