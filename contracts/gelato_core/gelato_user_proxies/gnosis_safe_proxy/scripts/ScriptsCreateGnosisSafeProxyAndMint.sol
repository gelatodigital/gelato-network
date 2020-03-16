pragma solidity ^0.6.4;

import "../interfaces/IScriptsCreateGnosisSafeProxyAndMint.sol";
import "./ScriptsCreateGnosisSafeProxy.sol";

contract ScriptsCreateGnosisSafeProxyAndMint is
    IScriptsCreateGnosisSafeProxyAndMint,
    ScriptsCreateGnosisSafeProxy
{
    // ========= Proxy Creation and Minting in 1 tx
    function create(
        address _mastercopy,
        bytes calldata _initializer,
        IGelatoCore _gelatoCore,
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        payable
        override
    {
        create(_mastercopy, _initializer);
        _gelatoCore.mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );
    }

    function createTwo(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce,
        IGelatoCore _gelatoCore,
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
        payable
        override
    {
        createTwo(_mastercopy, _initializer, _saltNonce);
        _gelatoCore.mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        );
    }
}