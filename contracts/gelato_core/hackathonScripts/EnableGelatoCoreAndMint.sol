pragma solidity ^0.6.2;

import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IGelatoCore.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../external/SafeMath.sol";
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
contract ScriptGnosisSafeEnableGelatoCoreAndMint {

    using SafeMath for uint256;
    // using Address for address;


    // !!!!!!!!! Kovan !!!!!!
    address public constant CONDITION_FEAR_GREED_INDEX_ADDRESS
        = 0x57e4025276e693e270EAE8900b94666e4721a657;
    address public constant DAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;

    event LogFailure(string error);


    /// @dev This function should be delegatecalled
    function enableModuleAndMint(
        address _gelatoCore,
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayloadWithSelector,
        bytes calldata _actionPayloadWithSelector
    )
        external
    {
        // 1. Fetch greedFearIndexNumerator
        IFearGreedIndex fearGreedIndexContract = IFearGreedIndex(
            CONDITION_FEAR_GREED_INDEX_ADDRESS
        );

        uint256 fearGreedIndexNumerator = fearGreedIndexContract.getConditionValue();

        uint256 ethAmountToSell
            = address(this).balance.mul(fearGreedIndexNumerator).div(100);

        // 2, Swap the respective amount of ETH to DAI
        try getUniswapExchange().ethToTokenSwapInput{ value: ethAmountToSell }(1, now) {
        } catch {
            revert("Error ethToTokenInput");
        }

        // 3. Whitelist Gelato Core
        // Whitelist GelatoCore as module on delegatecaller (Gnosis Safe Proxy)
        try IGnosisSafe(address(this)).enableModule(_gelatoCore) {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("enableModule error");
        }

        // 4. Mint Execution Claim
        // Mint on GelatoCore from delegatecaller (Gnosis Safe Proxy)
        try IGelatoCore(_gelatoCore).mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionAndAction,
            _conditionPayloadWithSelector,
            _actionPayloadWithSelector
        )  {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("mintExecutionClaim error");
        }

    }

     // Returns KOVAN uniswap factory
    function getUniswapExchange()
        internal
        view
        returns(IUniswapExchange)
    {
        IERC20 exchangeToken = IERC20(DAI);
        IUniswapFactory uniswapFactory = IUniswapFactory(
            0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30
        );
        uniswapFactory.getExchange(exchangeToken);
    }
}