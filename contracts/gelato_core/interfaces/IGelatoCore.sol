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

struct Task {
    Provider provider;
    Condition condition;
    Action[] actions;
    uint256 expiryDate;  // subject to rent payments; 0 == infinity.
}

struct ExecClaim {
    uint256 id;
    address userProxy;
    Task task;
}

interface IGelatoCore {
    event LogExecClaimMinted(
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

    event LogCollectExecClaimRent(
        address indexed provider,
        address indexed executor,
        uint256 indexed execClaimId,
        uint256 amount
    );

    // ================  Exec Suite =========================
    function mintExecClaim(Task calldata _task) external;

    function canExec(ExecClaim calldata _ec, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        external
        view
        returns(string memory);

    function exec(ExecClaim calldata _ec) external;

    function cancelExecClaim(ExecClaim calldata _ec) external;
    function batchCancelExecClaims(ExecClaim[] calldata _execClaims) external;

    function collectExecClaimRent(ExecClaim calldata _ec) external;
    function batchCollectExecClaimRent(ExecClaim[] calldata _execClaims) external;

    // ================  Getters =========================
    function currentExecClaimId() external view returns(uint256 currentId);
    function execClaimHash(uint256 _execClaimId) external view returns(bytes32);

    function lastExecClaimRentPaymentDate(uint256 _execClaimId) external view returns(uint256);
    function canCollectExecClaimRent(ExecClaim calldata _ec)
        external
        view
        returns(string memory);

    function hashExecClaim(ExecClaim calldata _ec) external pure returns(bytes32);
}
