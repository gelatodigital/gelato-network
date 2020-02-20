pragma solidity ^0.6.2;

import "../gelato_core/interfaces/IGnosisSafe.sol";

// For debugging purposes we do not revert if anything goes wrong
//  so that we can emit the LogFailure event. This is necessary because the
//  delegatecalling GnosisSafeProxy low-level catches reverts and overrides
//  their message. see ModuleManager.setupModules require expression:
// https://github.com/gnosis/safe-contracts/blob/aa0f3345b609a816ace6c448960ddb852b8a1bbd/contracts/base/ModuleManager.sol#L29

/// @title ScriptGnosisSafeEnableGelatoCore
/// @notice Script to be run during Gnosis Safe Proxy setup for Gelato integration
/// @dev Should be delegatecalled from gnosisSafeProxy.setup.setupModules(to,data):
///       - <to> should be the address of this contract: ScriptGnosisSafeEnableGelatoCore
///       - <data> should be the encodedPayload for enableGelatoCoreModule
contract ScriptGnosisSafeEnableGelatoCore {

    event LogFailure(string error);

    /// @dev This function should be delegatecalled
    function enableGelatoCoreModule(address _gelatoCore) external {
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        try IGnosisSafe(address(this)).enableModule(_gelatoCore) {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("enableModule error");
        }
    }
}