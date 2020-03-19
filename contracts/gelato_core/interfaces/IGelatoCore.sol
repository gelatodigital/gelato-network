pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { EnumerableSet } from "../../external/EnumerableSet.sol";

struct ExecClaim {
    uint256 id;
    address provider;
    address userProxy;
    address condition;
    address action;
    bytes conditionPayload;
    bytes actionPayload;
    bytes execPayload;
    uint256 expiryDate;
    uint256 executorSuccessFeeFactor;
    uint256 oracleSuccessFeeFactor;
}

interface IGelatoCore {
    event LogExecClaimMinted(
        address indexed executor,
        ExecClaim execClaim,
        bytes32 indexed execClaimHash
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

    event LogExecClaimCancelled(
        uint256 indexed execClaimId,
        address executor,
        address cancelor,
        bool expired
    );

    function mintExecClaim(address _executor, ExecClaim calldata _execClaim)
        external;

    function canExec(ExecClaim calldata _execClaim, bytes32 _execClaimHash)
        external
        view
        returns(string memory canExecResult);

    function exec(ExecClaim calldata _execClaim, bytes32 _execClaimHash)
        external;

    function cancelExecClaim(
        address _executor,
        ExecClaim calldata _execClaim,
        bytes32 _execClaimHash
    ) external;

    // ================  GETTER APIs =========================
    function currentExecClaimId() external view returns(uint256 currentId);

    function isSecondExecAttempt(uint256 _execClaimId)
        external
        view
        returns(bool);

    function execClaimHashCmp(ExecClaim calldata _execClaim, bytes32 _hash)
        external
        pure
        returns(bool);

    function isProviderLiquid(address _provider) external view returns(bool);

    // ================  Executors' Claims GETTER APIs =========================
    function isExecutorClaim(address _executor, bytes32 _execClaimHash)
        external
        view
        returns(bool);
    function numOfExecutorClaims(address _executor)
        external
        view
        returns(uint256);
    function executorClaims(address _executor)
        external
        view
        returns(bytes32[] memory);
}
