pragma solidity 0.6.0;

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
        uint256[3] triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external;

    /// @dev get the current executionClaimId
    /// @return uint256 current executionClaim Id
    function getCurrentExecutionClaimId() external view returns(uint256 currentId);

    /// @dev api to read from the userProxyByExecutionClaimId state variable
    /// @param _executionClaimId TO DO
    /// @return address of the userProxy behind _executionClaimId
    function getUserProxyWithExecutionClaimId(uint256 _executionClaimId)
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
    function getHashedExecutionClaim(uint256 _executionClaimId)
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
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
        uint256[3] calldata _triggerGasActionTotalGasMinExecutionGas,
        uint256 _executionClaimExpiryDate,
        uint256 _mintingDeposit
    )
        external
        returns(uint256);
}