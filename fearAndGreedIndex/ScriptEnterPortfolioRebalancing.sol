pragma solidity ^0.6.4;

import "../../gelato_core/gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";
import "../../gelato_core/gelato_user_proxies/gnosis_safe_proxy/scripts/ScriptGnosisSafeEnableGelatoCore.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../gelato_actions/fearAndGreedIndex/ActionRebalancePortfolio.sol";
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
    ActionRebalancePortfolio
{
    using SafeMath for uint256;
    using Address for address;
    // using Address for address;

    /// @dev This function should be delegatecalled
    function enterPortfolioRebalancing(
        address _gelatoCore,
        address[2] calldata _gelatoProviderAndExecutor
    )
        external
    {
        // 1. Whitelist Gelato Core
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        enableGelatoCoreModule(_gelatoCore);

        // 2. Execute ActionRebalancePortfolio.action => Swaps ETH into DAI
        action(payable(_gelatoProviderAndExecutor[0]));
    }
}
