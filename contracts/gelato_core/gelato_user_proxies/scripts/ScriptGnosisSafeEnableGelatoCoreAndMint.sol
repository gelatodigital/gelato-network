pragma solidity ^0.6.2;

import "../IGnosisSafe.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";

// For debugging purposes we do not revert if anything goes wrong
//  so that we can emit the LogFailure event. This is necessary because the
//  delegatecalling GnosisSafeProxy low-level catches reverts and overrides
//  their message. see ModuleManager.setupModules require expression:
// https://github.com/gnosis/safe-contracts/blob/aa0f3345b609a816ace6c448960ddb852b8a1bbd/contracts/base/ModuleManager.sol#L29

/// @title ScriptGnosisSafeEnableGelatoCoreAndMint
/// @notice Script to be run during Gnosis Safe Proxy setup for Gelato integration
/// @dev Should be delegatecalled from gnosisSafeProxy.setup.setupModules(to,data):
///       - <to> address of this contract: ScriptGnosisSafeEnableGelatoCoreAndMint
///       - <data> encodedPayload for enableModuleAndMint
contract ScriptGnosisSafeEnableGelatoCoreAndMint {

    event LogFailure(string error);

    /// @dev This function should be delegatecalled
    function enableModuleAndMint(
        address _gelatoCore,
        address[2] calldata _providerAndExecutor,
        IGelatoCondition _condition,
        bytes calldata _conditionPayloadWithSelector,
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate
    )
        external
    {
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        try IGnosisSafe(address(this)).enableModule(_gelatoCore) {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("enableModule error");
        }

        // Mint on GelatoCore from delegatecaller (Gnosis Safe Proxy)
        try IGelatoCore(_gelatoCore).mintExecutionClaim(
            _providerAndExecutor,
            _condition,
            _conditionPayloadWithSelector,
            _action,
            _actionPayloadWithSelector,
            _executionClaimExpiryDate
        )  {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("mintExecutionClaim error");
        }
    }
}