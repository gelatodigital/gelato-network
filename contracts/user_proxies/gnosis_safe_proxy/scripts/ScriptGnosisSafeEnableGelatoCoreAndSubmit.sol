pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IGnosisSafe.sol";
import { IGelatoCore, TaskReceipt } from "../../../gelato_core/interfaces/IGelatoCore.sol";

// For debugging purposes we do not revert if anything goes wrong
//  so that we can emit the LogFailure event. This is necessary because the
//  delegatecalling GnosisSafeProxy low-level catches reverts and overrides
//  their message. see ModuleManager.setupModules require expression:
// https://github.com/gnosis/safe-contracts/blob/aa0f3345b609a816ace6c448960ddb852b8a1bbd/contracts/base/ModuleManager.sol#L29

/// @title ScriptGnosisSafeEnableGelatoCoreAndSubmit
/// @notice Script to be run during Gnosis Safe Proxy setup for Gelato integration
/// @dev Should be delegatecalled from gnosisSafeProxy.setup.setupModules(to,data):
///       - <to> address of this contract: ScriptGnosisSafeEnableGelatoCoreAndSubmit
///       - <data> encodedPayload for enableModuleAndSubmit
contract ScriptGnosisSafeEnableGelatoCoreAndSubmit {

    event LogFailure(string error);

    /// @dev This function should be delegatecalled
    function enableModuleAndSubmit(address _gelatoCore, TaskReceipt memory _TR)
        public
    {
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        try IGnosisSafe(address(this)).enableModule(_gelatoCore) {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("enableModule error");
        }

        // SubmitTask on GelatoCore from delegatecaller (Gnosis Safe Proxy)
        try IGelatoCore(_gelatoCore).submitTask(_TR.task) {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("submitTask error");
        }
    }
}
