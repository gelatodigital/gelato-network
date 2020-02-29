pragma solidity ^0.6.2;

import "../../conditions/IGelatoCondition.sol";
import "../../actions/IGelatoAction.sol";

/// @title IGelatoCore - solidity interface of GelatoCore
/// @notice canExecute API and minting, execution, cancellation of ExecutionClaims
/// @dev all the APIs and events are implemented inside GelatoCore
interface IGelatoCore {
    event LogExecutionClaimMinted(
        address[3] indexed userProxyProviderAndExecutor,
        uint256 indexed executionClaimId,
        address[2] indexed conditionAndAction,
        bytes conditionPayload,
        bytes executionPayload,
        uint256 executionClaimExpiryDate
    );

    // Caution: there are no guarantees that CanExecuteResult and/or reason
    //  are implemented in a logical fashion by condition/action developers.
    event LogCanExecuteSuccess(
        address[3] indexed userProxyProviderAndExecutor,
        uint256 indexed executionClaimId,
        address[2] conditionAndAction,
        string canExecuteResult
    );

    event LogCanExecuteFailed(
        address[3] indexed userProxyProviderAndExecutor,
        uint256 indexed executionClaimId,
        address[2] conditionAndAction,
        string canExecuteResult
    );

    event LogSuccessfulExecution(
        address[3] indexed userProxyProviderAndExecutor,
        address indexed executor,
        uint256 indexed executionClaimId,
        address[2] conditionAndAction
    );

    // Caution: there are no guarantees that ExecutionResult and/or reason
    //  are implemented in a logical fashion by condition/action developers.
    event LogExecutionFailure(
        address[3] indexed userProxyProviderAndExecutor,
        address indexed executor,
        uint256 indexed executionClaimId,
        address[2] conditionAndAction,
        string executionFailureReason
    );

    event LogExecutionClaimCancelled(
        address[3] indexed userProxyProviderAndExecutor,
        uint256 indexed executionClaimId,
        address indexed cancelor,
        bool executionClaimExpired
    );

    function mintExecutionClaim(
        address[3] calldata _userProxyProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload
    )
        external;

    function canExecute(
        address[3] calldata _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        view
        returns (string memory);


    function execute(
        address[3] calldata _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external;


    function cancelExecutionClaim(
        address[3] calldata _userProxyProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external;

    function currentExecutionClaimId() external view returns(uint256 currentId);

    function executionClaimHash(uint256 _executionClaimId)
        external
        view
        returns(bytes32);

    function userProxyByExecutionClaimId(uint256 _executionClaimId)
        external
        view
        returns(address);


    function MAXGAS() external pure returns(uint256);
}