pragma solidity ^0.6.4;

import "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IScriptsCreateGnosisSafeProxyAndMint {
    function create(
        address _mastercopy,
        bytes calldata _initializer,
        IGelatoCore _gelatoCore,
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    ) external payable; // address userProxy

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
    ) external payable;
}
