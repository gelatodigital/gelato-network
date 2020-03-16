pragma solidity ^0.6.2;

import "../../gelato_core/interfaces/IGnosisSafe.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";
import "../../gelato_core/gelato_user_proxies/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../actions/fearAndGreedIndex/ActionRebalancePortfolioKovan.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";

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
contract ScriptEnterPortfolioRebalancing is
    ScriptGnosisSafeEnableGelatoCore,
    ActionRebalancePortfolioKovan
{
    using SafeMath for uint256;
    using Address for address;
    // using Address for address;

    /// @dev This function should be delegatecalled
    function enterPortfolioRebalancing(address _gelatoCore) external {
        // 1. Whitelist Gelato Core
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute ActionRebalancePortfolioKovan.action => Swaps ETH into DAI
        action();
    }
}
