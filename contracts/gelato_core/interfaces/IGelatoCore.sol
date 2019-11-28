pragma solidity ^0.5.10;

import "../GelatoCoreEnums.sol";
import "./IGelatoUserProxy.sol";
import "../../triggers/IGelatoTrigger.sol";
import "../../actions/IGelatoAction.sol";

interface IGelatoCore {

    event LogNewExecutionClaimMinted(
        address indexed selectedExecutor,
        uint256 indexed executionClaimId,
        IGelatoUserProxy indexed userProxy,
        uint256 userProxyExecGas,
        uint256 executionClaimExpiryDate,
        uint256 mintingDeposit
    );

    event LogTriggerActionMinted(
        uint256 indexed executionClaimId,
        IGelatoTrigger indexed trigger,
        bytes triggerPayloadWithSelector,
        IGelatoAction indexed action,
        bytes actionPayloadWithSelector
    );

    event LogCanExecuteFailed(
        uint256 indexed executionClaimId,
        address payable indexed executor,
        GelatoCoreEnums.CanExecuteCheck indexed canExecuteResult
    );

    event LogClaimExecutedAndDeleted(
        uint256 indexed executionClaimId,
        GelatoCoreEnums.ExecutionResult indexed executionResult,
        address payable indexed executor,
        IGelatoUserProxy userProxy,
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

    function mintExecutionClaim(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        address payable _selectedExecutor

    )
        external
        payable;

    function execute(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _userProxyExecGas,
        uint256 _executionClaimId,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult);

    function cancelExecutionClaim(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _executionClaimId,
        address payable _selectedExecutor,
        uint256 _userProxyExecGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external;

    function getCurrentExecutionClaimId() external view returns(uint256 currentId);

    function getUserProxyWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(IGelatoUserProxy);

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address payable);

    function getHashedExecutionClaim(uint256 _executionClaimId)
        external
        view
        returns(bytes32);

    function canExecute(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        IGelatoUserProxy _userProxy,
        uint256 _userProxyExecGas,
        uint256 _executionClaimId,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck);

    // IGelatoUserProxyManager
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

    function getMinExecutionGasRequirement(uint256 _actionGasStipend)
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