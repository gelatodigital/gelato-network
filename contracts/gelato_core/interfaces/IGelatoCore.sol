pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { IGelatoCondition } from "../../gelato_conditions/IGelatoCondition.sol";

struct Provider {
    address addr;  //  if msg.sender == provider => self-Provider
    IGelatoProviderModule module;  //  can be IGelatoProviderModule(0) for self-Providers
}

struct Condition {
    IGelatoCondition inst;  // can be AddressZero for self-conditional Actions
    bytes data;  // can be bytes32(0) for self-conditional Actions
}

enum Operation { Call, Delegatecall }

struct Action {
    address inst;
    bytes data;
    Operation operation;
    uint256 value;
    bool termsOkCheck;
}

struct Task {  //
    Provider provider;
    Condition condition;  // optional
    Action[] actions;
    uint256 expiryDate;  // subject to rent payments; 0 == infinity.
}

struct ExecClaim {  // TaskReceipt
    uint256 id;
    address userProxy;
    Task task;
}

interface IGelatoCore {
    event LogSubmitTask(
        address indexed executor,
        uint256 indexed execClaimId,
        bytes32 indexed execClaimHash,
        ExecClaim execClaim
    );

    event LogExecSuccess(
        address indexed executor,
        uint256 indexed execClaimId,
        uint256 executorSuccessFee,
        uint256 sysAdminSuccessFee
    );
    event LogCanExecFailed(
        address indexed executor,
        uint256 indexed execClaimId,
        string reason
    );
    event LogExecFailed(
        address indexed executor,
        uint256 indexed execClaimId,
        uint256 executorRefund,
        string reason
    );
    event LogExecutionRevert(
        address indexed executor,
        uint256 indexed execClaimId,
        uint256 executorRefund
    );

    event LogExecClaimCancelled(uint256 indexed execClaimId);

    // ================  Exec Suite =========================
    /// @notice Submit a gelato task that will be executed if the specified condition and action(s) terms are fulfilled
    /// @dev Use only through a Proxy contract which is defined in the selected provider module
    /// @param _task Seleted provider, condition and action details, plus the expiry date after which the task is rendered useless
    function submitTask(Task calldata _task) external;

    /// @notice Off-chain validation for executors to see if an execution claim is executable
    /// @dev Only used for off-chain validation
    /// @param _ec ExecutionClaim, consisting of user task, user proxy address and id
    /// @param _gelatoMaxGas Gas Limit to send to exec by executor to receive a full refund even if tx reverts
    /// @param _execTxGasPrice Gas Price of gelatoCore's gas price oracle
    function canExec(ExecClaim calldata _ec, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        external
        view
        returns(string memory);

    /// @notice Executes the users task after conducting all condition and actions(s) term(s) checks
    /// @dev Executor gets refunded, even if the specified action(s) revert
    /// @param _ec ExecutionClaim, consisting of user task, user proxy address and id
    function exec(ExecClaim calldata _ec) external;

    /// @notice Cancel execution claim
    /// @dev Callable only by userProxy or selected provider
    /// @param _ec ExecutionClaim, consisting of user task, user proxy address and id
    function cancelExecClaim(ExecClaim calldata _ec) external;

    /// @notice Batch Cancel execution claims
    /// @dev Callable only by userProxy or selected provider
    /// @param _execClaims ExecutionClaim Array, consisting of user task, user proxy address and id
    function batchCancelExecClaims(ExecClaim[] calldata _execClaims) external;

    /// @notice Compute hash of execution claim
    /// @param _ec ExecutionClaim, consisting of user task, user proxy address and id
    /// @return hash of execClaim
    function hashExecClaim(ExecClaim calldata _ec) external pure returns(bytes32);

    // ================  Getters =========================
    /// @notice Returns the executionClaimId of the last ExecClaim submitted
    /// @return currentId currentId, last ExecutionClaimId submitted
    function currentExecClaimId() external view returns(uint256 currentId);

    /// @notice Returns computed execClaim hash, used to check for execClaim validity
    /// @param _execClaimId Id of execClaim emitted in submission event
    /// @return hash of execClaim
    function execClaimHash(uint256 _execClaimId) external view returns(bytes32);

}
