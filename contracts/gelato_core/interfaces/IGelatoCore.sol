pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

struct ExecClaim {
    uint256 id;
    address provider;
    address providerModule;
    address user;
    address condition;
    address action;
    bytes conditionPayload;
    bytes actionPayload;
    uint256 expiryDate;
    uint256 executorSuccessFeeFactor;
    uint256 oracleSuccessFeeFactor;
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

    function mintExecClaim(ExecClaim calldata _execClaim, address _executor)
        external
        payable;

    function canExec(
        ExecClaim calldata _execClaim,
        bytes32 _execClaimHash,
        uint256 _gelatoGasPrice,
        uint256 _gelatoMaxGas
    )
        external
        view
        returns(string memory);

    function exec(ExecClaim calldata _execClaim, bytes32 _execClaimHash) external;

    function cancelExecClaim(ExecClaim calldata _execClaim) external;

    // ================  GETTER APIs =========================
    function currentExecClaimId() external view returns(uint256 currentId);

    function isSecondExecAttempt(uint256 _execClaimId)
        external
        view
        returns(bool);

    function isProviderLiquid(address _provider, uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(bool);
}
