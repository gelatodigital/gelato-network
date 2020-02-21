pragma solidity ^0.6.2;

import "../../conditions/IGelatoCondition.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCore - solidity interface of GelatoCore
/// @notice canExecute API and minting, execution, cancellation of ExecutionClaims
/// @dev all the APIs and events are implemented inside GelatoCore
interface IGelatoCore {

    enum CanExecuteResult {
        ProviderIlliquidity,
        ExecutionClaimAlreadyExecutedOrCancelled,
        ExecutionClaimNonExistant,
        ExecutionClaimExpired,
        WrongCalldataOrMsgSender,  // also returns if a not-selected executor calls fn
        ConditionNotOk,
        UnhandledConditionError,
        Executable
    }

    enum StandardReason { Ok, NotOk, UnhandledError }

    event LogExecutionClaimMinted(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address[2] conditionAndAction,
        bytes conditionPayload,
        bytes executionPayload,
        uint256 executionClaimExpiryDate,
        uint256 claimedProviderLiquidity
    );

    // Caution: there are no guarantees that CanExecuteResult and/or reason
    //  are implemented in a logical fashion by condition/action developers.
    event LogCanExecuteSuccess(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address[2] conditionAndAction,
        CanExecuteResult canExecuteResult,
        uint8 reason
    );

    event LogCanExecuteFailed(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address[2] conditionAndAction,
        CanExecuteResult canExecuteResult,
        uint8 reason
    );

    event LogSuccessfulExecution(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address[2] conditionAndAction,
        IGelatoAction action
    );

    // Caution: there are no guarantees that ExecutionResult and/or reason
    //  are implemented in a logical fashion by condition/action developers.
    event LogExecutionFailure(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address[2] conditionAndAction,
        string executionFailureReason
    );

    event LogExecutionClaimCancelled(
        address[2] indexed providerAndExecutor,
        uint256 indexed executionClaimId,
        address indexed userProxy,
        address cancelor,
        bool executionClaimExpired,
        uint256 claimedProviderLiquidity
    );

    /**
     * @dev API for minting execution claims on gelatoCore
     * @notice re-entrancy guard because accounting ops are present inside fn
     * @notice msg.value is a refundable deposit - only a fee if executed
     * @notice minting event split into two, due to stack too deep issue
     */
    function mintExecutionClaim(
        address[2] calldata _providerAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayloadWithSelector,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        external;

    /**
     * @notice If return value == 6, the claim is executable
     * @dev The API for executors to check whether a claim is executable.
     *       Caution: there are no guarantees that CanExecuteResult and/or reason
     *       are implemented in a logical fashion by condition/action developers.
     * @return CanExecuteResult The outcome of the canExecuteCheck
     * @return reason The reason for the outcome of the canExecute Check
     */
    function canExecute(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayloadWithSelector,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate,
        uint256 claimedProviderLiquidity
    )
        external
        view
        returns (CanExecuteResult, uint8 reason);


    /**
     * @notice the API executors call when they execute an executionClaim
     * @dev if return value == 0 the claim got executed
     */
    function execute(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayloadWithSelector,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate,
        uint256 claimedProviderLiquidity
    )
        external;

    /**
     * @dev API for canceling executionClaims
     * @notice re-entrancy protection due to accounting operations and interactions
     * @notice prior to executionClaim expiry, only owner of _userProxy can cancel
        for a refund. Post executionClaim expiry, _executor can also cancel,
        for a reward.
     * @notice .sendValue instead of .transfer due to IstanbulHF
     */
    function cancelExecutionClaim(
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayloadWithSelector,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate,
        uint256 claimedProviderLiquidity
    )
        external;

    /// @dev get the current executionClaimId
    /// @return currentId uint256 current executionClaim Id
    function currentExecutionClaimId() external view returns(uint256 currentId);

    /// @dev interface to read from the hashedExecutionClaims state variable
    /// @param _executionClaimId TO DO
    /// @return the bytes32 hash of the executionClaim with _executionClaimId
    function executionClaimHash(uint256 _executionClaimId)
        external
        view
        returns(bytes32);

    /// @dev api to read from the userProxyByExecutionClaimId state variable
    /// @param _executionClaimId TO DO
    /// @return address of the userProxy behind _executionClaimId
    function userProxyByExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address);
}