pragma solidity ^0.6.2;

import "../gelato_core/interfaces/IGelatoCore.sol";

/// @title CreateAndMint
/// @notice Script to be delegatecalled during Gnosis Safe Proxy setup
/// @dev gnosisSafeProxy.setup.setupModules(to,data:
///       - <to> should be the address of GnosisSafeProxyGelatoCoreSetup
///       - <data> should be the encodedPayload
contract GnosisSafeProxyGelatoCoreSetup {
    /// @dev This function should be delegatecalled
    function whitelistAndMint(
        address _gelatoCore,
        address _selectedExecutor,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector
    )
        external
    {
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        try IGnosisSafe(address(this)).enableModule(_gelatoCore) {
        } catch Error(string memory error) {
            revert(error);
        } catch {
            revert("GnosisSafeProxyGelatoCoreSetup: undefined enableModule error");
        }

        // Mint on GelatoCore from delegatecaller (Gnosis Safe Proxy)
        try IGelatoCore(_gelatoCore).mintExecutionClaim(
            _selectedExecutor,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector
        ) {
        } catch Error(string memory error) {
            revert(error);
        } catch {
            revert("GnosisSafeProxyGelatoCoreSetup: undefined mintExecutionClaim error");
        }
    }
}