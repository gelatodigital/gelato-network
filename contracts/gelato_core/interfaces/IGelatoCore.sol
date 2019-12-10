pragma solidity ^0.5.11;

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
        IGelatoAction _action,
        bytes _actionPayloadWithSelector,
        uint256[3] triggergasActiongastotalMinexecutiongas,
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
        uint256[3] calldata _triggergasActiongastotalMinexecutiongas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck);


    /**
     * @dev the API executors call when they execute an executionClaim
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
        uint256[3] calldata _triggergasActiongastotalMinexecutiongas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult);

    /**
     * @dev API for canceling executionClaims
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
        uint256[3] calldata _triggergasActiongastotalMinexecutiongas,
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

    /// @notice documented inside IGelatoUserProxyManager
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

    /// @notice documented inside IGelatoCoreAccounting
    function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external;

    /// @notice documented inside IGelatoCoreAccounting
    function deregisterExecutor() external;

    /// @notice documented inside IGelatoCoreAccounting
    function setExecutorPrice(uint256 _newExecutorGasPrice) external;

    /// @notice documented inside IGelatoCoreAccounting
    function setExecutorClaimLifespan(uint256 _newExecutorClaimLifespan) external;

    /// @notice documented inside IGelatoCoreAccounting
    function withdrawExecutorBalance() external;

    // @notice documented inside IGelatoCoreAccounting
    // function setMinExecutionClaimLifespan(uint256 _newMinExecutionClaimLifespan) external;

    // @notice documented inside IGelatoCoreAccounting
    // function setGelatoCoreExecGasOverhead(uint256 _newGasOverhead) external;

    // @notice documented inside IGelatoCoreAccounting
    // function setUserProxyExecGasOverhead(uint256 _newGasOverhead) external;

    /// @notice documented inside IGelatoCoreAccounting
    function getMinExecutionClaimLifespan() external pure returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getExecutorPrice(address _executor) external view returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getExecutorClaimLifespan(address _executor) external view returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getExecutorBalance(address _executor) external view returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getGelatoCoreExecGasOverhead() external pure returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getUserProxyExecGasOverhead() external pure returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getTotalExecutionGasOverhead() external pure returns(uint256);

    /// @notice documented inside IGelatoCoreAccounting
    function getMintingDepositPayable(
        address _selectedExecutor,
        IGelatoTrigger _trigger,
        IGelatoAction _action
    )
        external
        view
        returns(uint256 mintingDepositPayable);

    /// @notice documented inside IGelatoCoreAccounting
    function getMinExecutionGas(uint256 _triggerGas, uint256 _actionGasTotal)
        external
        pure
        returns(uint256);


    // ==================== GAS TESTING ==============================================
    // ============= GELATO_GAS_TEST_USER_PROXY_MANAGER ==============
    /// @notice documented inside IGelatoGasTestUserProxyManager
    function createGasTestUserProxy() external returns(address gasTestUserProxy);

    /// @notice documented inside IGelatoGasTestUserProxyManager
    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        returns(address);

    /// @notice documented inside IGelatoGasTestUserProxyManager
    function getGasTestProxyOfUser(address _user)
        external
        view
        returns(address);

    // ============= GELATO_GAS_TESTING_FNs ==============
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
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggergasActiongastotalMinexecutiongas,
        uint256 _actionConditionsOkGas,
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
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggergasActiongastotalMinexecutiongas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(uint256);
}