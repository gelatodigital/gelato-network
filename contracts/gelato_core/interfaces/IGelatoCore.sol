pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

struct ExecClaim {
    uint256 id;  // set automatically by mintExecClaim
    address provider;   //  if msg.sender == provider => self-Provider
    address providerModule;  //  can be AddressZero for self-Providers
    address userProxy;  // set automatically to msg.sender by mintExecClaim
    address condition;   // can be AddressZero for self-conditional Actions
    address action;
    bytes conditionPayload;  // can be bytes32(0) for self-conditionalActions
    bytes actionPayload;
    uint256 expiryDate;  // 0 => defaults to global maximum
}

interface IGelatoCore {
    event LogExecClaimMinted(
        address indexed executor,
        uint256 indexed execClaimId,
        bytes32 indexed execClaimHash,
        ExecClaim execClaim
    );

    event LogCanExecSuccess(
        address indexed executor,
        uint256 indexed execClaimId,
        string canExecResult
    );
    event LogCanExecFailed(
        address indexed executor,
        uint256 indexed execClaimId,
        string canExecResult
    );

    event LogExecSuccess(address indexed executor, uint256 indexed execClaimId);
    event LogExecFailed(
        address indexed executor,
        uint256 indexed execClaimId,
        string reason
    );

    event LogExecClaimCancelled(uint256 indexed execClaimId);

    event LogCollectExecClaimRent(
        address indexed provider,
        address indexed executor,
        uint256 indexed execClaimId,
        uint256 amount
    );

    function mintExecClaim(ExecClaim calldata _execClaim) external;
    function mintSelfProvidedExecClaim(ExecClaim calldata _execClaim, address _executor)
        external
        payable;

    function canExec(ExecClaim calldata _execClaim, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory);

    function exec(ExecClaim calldata _execClaim) external;

    function cancelExecClaim(ExecClaim calldata _execClaim) external;
    function batchCancelExecClaim(ExecClaim[] calldata _execClaims) external;

    function collectExecClaimRent(ExecClaim calldata _execClaim) external;
    function batchCollectExecClaimRent(ExecClaim[] calldata _execClaims) external;

    // ================  GETTER APIs =========================
    function currentExecClaimId() external view returns(uint256 currentId);
    function execClaimHash(uint256 _execClaimId) external view returns(bytes32);
    function lastExecClaimRentPaymentDate(uint256 _execClaimId) external view returns(uint256);
}
