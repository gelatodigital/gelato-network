pragma solidity ^0.5.10;

import "./GelatoCoreEnums.sol";
import "./IGelatoUserProxy.sol";
import "../triggers/IGelatoTrigger.sol";
import "../actions/IGelatoAction.sol";

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

    event LogExecutionResult(
        uint256 indexed executionClaimId,
        GelatoCoreEnums.ExecutionResult indexed executionResult,
        address payable indexed executor
    );

    event LogClaimExecutedAndDeleted(
        uint256 indexed executionClaimId,
        IGelatoUserProxy indexed userProxy,
        address payable indexed executor,
        uint256 gasCheck,
        uint256 gasPriceUsed,
        uint256 executionCostEstimate,
        uint256 executorPayout
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
}