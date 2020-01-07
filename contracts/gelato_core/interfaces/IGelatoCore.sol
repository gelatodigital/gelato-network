pragma solidity ^0.6.0;

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
        IGelatoTrigger trigger,
        bytes triggerPayloadWithSelector,
        IGelatoAction action,
        bytes actionPayloadWithSelector,
        uint256[3] triggerGasActionTotalGasMinExecutionGas,
        uint256 executionClaimExpiryDate,
        uint256 mintingDeposit
    );

    event LogCanExecuteFailed(
        address executor,
        uint256 indexed executionClaimId,
        IGelatoTrigger indexed trigger,
        uint8 triggerErrorCode,
        IGelatoAction indexed action,
        uint8 actionErrorCode,
        GelatoCoreEnums.CanExecuteCheck canExecuteResult
    );

    event LogSuccessfulExecution(
        address indexed executor,
        uint256 indexed executionClaimId,
        IGelatoTrigger trigger,
        IGelatoAction indexed action,
        uint256 gasPriceUsed,
        uint256 executionCostEstimate,
        uint256 executorReward
    );

    event LogExecutionFailure(
        address executor,
        uint256 indexed executionClaimId,
        IGelatoTrigger trigger,
        IGelatoAction indexed action,
        GelatoCoreEnums.ExecutionResult indexed executionResult,
        uint8 actionErrorCode
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
        address _selectedExecutor,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns (GelatoCoreEnums.CanExecuteCheck, uint8 errorCode);


    /**
     * @notice the API executors call when they execute an executionClaim
     * @dev if return value == 0 the claim got executed
     */
    function execute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external;

    /**
     * @dev API for canceling executionClaims
     * @notice re-entrancy protection due to accounting operations and interactions
     * @notice prior to executionClaim expiry, only owner of _userProxy can cancel
        for a refund. Post executionClaim expiry, _selectedExecutor can also cancel,
        for a reward.
     * @notice .sendValue instead of .transfer due to IstanbulHF
     */
    function cancelExecutionClaim(
        address _selectedExecutor,
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external;

    /// @dev get the current executionClaimId
    /// @return currentId uint256 current executionClaim Id
    function getCurrentExecutionClaimId() external view returns(uint256 currentId);

    /// @dev api to read from the userProxyByExecutionClaimId state variable
    /// @param _executionClaimId TO DO
    /// @return address of the userProxy behind _executionClaimId
    function userProxyWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(IGelatoUserProxy);

    function getUserWithExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address);

    /// @dev interface to read from the hashedExecutionClaims state variable
    /// @param _executionClaimId TO DO
    /// @return the bytes32 hash of the executionClaim with _executionClaimId
    function executionClaimHash(uint256 _executionClaimId)
        external
        view
        returns(bytes32);

    // = GAS_BENCHMARKING ==============
    function revertLogGasTriggerCheck(
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        uint256 _triggerGas
    )
        external
        view
        returns(GelatoCoreEnums.TriggerCheck);

    function revertLogGasActionConditionsCheck(
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionConditionsOkGas
    )
        external
        view
        returns(GelatoCoreEnums.ActionConditionsCheck);

    function revertLogGasCanExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _actionConditionsOkGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        view
        returns(GelatoCoreEnums.CanExecuteCheck);

    function revertLogGasActionViaGasTestUserProxy(
        IGelatoUserProxy _gasTestUserProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        returns(GelatoCoreEnums.ExecutionResult, uint8 actionErrorCode);

    function revertLogGasTestUserProxyExecute(
        IGelatoUserProxy _userProxy,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _actionGas
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult, uint8 actionErrorCode);

    function revertLogGasExecute(
        uint256 _executionClaimId,
        IGelatoUserProxy _userProxy,
        IGelatoTrigger _trigger,
        bytes calldata _triggerPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(GelatoCoreEnums.ExecutionResult executionResult, uint8 actionErrorCode);
}