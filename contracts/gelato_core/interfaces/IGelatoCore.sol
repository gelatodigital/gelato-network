pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

struct Task {
    address provider;   //  if msg.sender == provider => self-Provider
    address providerModule;  //  can be AddressZero for self-Providers
    address condition;   // can be AddressZero for self-conditional Actions
    address action;
    bytes conditionPayload;  // can be bytes32(0) for self-conditional Actions
    bytes actionPayload;
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

    function mintExecClaim(Task calldata _task) external;
    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable;

    function canExec(ExecClaim calldata _ec, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory);

    function exec(ExecClaim calldata _ec) external;

    function cancelExecClaim(ExecClaim calldata _ec) external;
    function batchCancelExecClaim(ExecClaim[] calldata _execClaims) external;

    function collectExecClaimRent(ExecClaim calldata _ec) external;
    function batchCollectExecClaimRent(ExecClaim[] calldata _execClaims) external;

    // ================  GETTER APIs =========================
    function currentExecClaimId() external view returns(uint256 currentId);
    function execClaimHash(uint256 _execClaimId) external view returns(bytes32);
    function lastExecClaimRentPaymentDate(uint256 _execClaimId) external view returns(uint256);
    function EXEC_TX_OVERHEAD() external pure returns(uint256);
}
