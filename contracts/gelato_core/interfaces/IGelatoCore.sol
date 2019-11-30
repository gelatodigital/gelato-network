pragma solidity ^0.5.10;

import "../GelatoCoreEnums.sol";
import "./IGelatoUserProxy.sol";
import "../../triggers/IGelatoTrigger.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCore - solidity interface of GelatoCore
/// @notice canExecute API and minting, execution, cancellation of ExecutionClaims
/// @dev all the APIs and events are implemented inside GelatoCore
interface IGelatoCore {

    event LogNewExecutionClaimMinted(
        address indexed selectedExecutor,
        uint256 indexed executionClaimId,
        IGelatoUserProxy indexed userProxy,
        IGelatoTrigger _trigger,
        bytes _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes _actionPayloadWithSelector,
        uint256 userProxyExecGas,
        uint256 executionClaimExpiryDate,
        uint256 mintingDeposit
    );

    event LogCanExecuteFailed(
        uint256 indexed executionClaimId,
        address payable indexed executor,
        GelatoCoreEnums.CanExecuteCheck indexed canExecuteResult
    );

    event LogClaimExecutedAndDeleted(
        address payable indexed executor,
        uint256 indexed executionClaimId,
        IGelatoUserProxy userProxy,
        GelatoCoreEnums.ExecutionResult indexed executionResult,
        uint256 gasPriceUsed,
        uint256 executionCostEstimate,
        uint256 executorPayout,
        uint256 gasLeft
    );

    event LogUserProxyExecuteGas(uint256 gasBefore, uint256 gasAfter, uint256 delta);

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
     * @param _userProxyExecGas executors get this from LogExecutionClaimMinted
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
        uint256 _userProxyExecGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck);

    function logCanExecuteGasViaRevert(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _userProxyExecGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns(GelatoCoreEnums.CanExecuteCheck canExecuteResult);

    /**
     * @dev the API executors call when they execute an executionClaim
     * @param _executionClaimId executors get this from LogExecutionClaimMinted
     * @param _userProxy executors get this from LogExecutionClaimMinted
     * @param _trigger executors get this from LogTriggerActionMinted
     * @param _triggerPayloadWithSelector executors get this from LogTriggerActionMinted
     * @param _actionPayloadWithSelector executors get this from LogExecutionClaimMinted
     * @param _action executors get this from LogTriggerActionMinted
     * @param _userProxyExecGas executors get this from LogExecutionClaimMinted
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
        uint256 _userProxyExecGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult);

    function logExecuteGasViaRevert(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _userProxyExecGas,
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
     * @param _userProxyExecGas callers get this from LogExecutionClaimMinted
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
        uint256 _userProxyExecGas,
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

    // IGelatoCoreAccounting
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

    event LogSetCanExecMaxGas(uint256 canExecMaxGas, uint256 newCanExecMaxGas);

    event LogSetGelatoCoreExecGasOverhead(
        uint256 gelatoCoreExecGasOverhead,
        uint256 _newGasOverhead
    );

    event LogSetUserProxyExecGasOverhead(
        uint256 userProxyExecGasOverhead,
        uint256 _newGasOverhead
    );

    function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external;

    function deregisterExecutor() external;

    function setExecutorPrice(uint256 _newExecutorGasPrice) external;

    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;

    function withdrawExecutorBalance() external;

    function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan) external;

    function setCanExecMaxGas(uint256 _newCanExecMaxGas) external;

    function setGelatoCoreExecGasOverhead(uint256 _newGasOverhead) external;

    function setUserProxyExecGasOverhead(uint256 _newGasOverhead) external;

    function getMinExecutionGasRequirement(uint256 _actionGasTotal)
        external
        view
        returns(uint256);

    function getMintingDepositPayable(IGelatoAction _action, address _selectedExecutor)
        external
        view
        returns(uint256 mintingDepositPayable);

    function getMinExecutionClaimLifespan() external view returns(uint256);

    function getExecutorPrice(address _executor) external view returns(uint256);

    function getExecutorClaimLifespan(address _executor) external view returns(uint256);

    function getExecutorBalance(address _executor) external view returns(uint256);

    function getCanExecMaxGas() external view returns(uint256);

    function getGelatoCoreExecGasOverhead() external view returns(uint256);

    function getUserProxyExecGasOverhead() external view returns(uint256);

    function getNonActionExecutionGas() external view returns(uint256);
    // =========================
}