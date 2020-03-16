pragma solidity ^0.6.4;

import "../GelatoActionsStandard.sol";
import "./ActionRebalancePortfolio.sol";
import "../../external/IERC20.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";

contract ActionChainedRebalancePortfolio is ActionRebalancePortfolio {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    event Received(address indexed sender, uint256 indexed value);

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns (bytes4) {
        return ActionChainedRebalancePortfolio.chainedAction.selector;
    }

    // function action(address _executor, address _gasProvider) external virtual returns(uint256) {
    function chainedAction(
        // ChainedMintingParams
        address[2] calldata _selectedProviderAndExecutor,
        address[2] calldata _conditionAndAction
    ) external {
        // Execute Rebalancing action
        uint256 newFearAndGreedIndex = super.action(address(_selectedProviderAndExecutor[0]).toPayable());

        // Encode FearAndGreedIndex Condition
        bytes memory conditionPayload = abi.encodeWithSelector(
            bytes4(keccak256("reached(uint256)")),
            newFearAndGreedIndex
        );

        // // Encode This Action
        bytes memory actionPayload = abi.encodeWithSelector(
            actionSelector(),
            _selectedProviderAndExecutor,
            _conditionAndAction
        );

        // Mint new Claim
        try getGelatoCore().mintExecutionClaim(
            _selectedProviderAndExecutor,
            _conditionAndAction,
            conditionPayload,
            actionPayload,
            0  // executionClaimExpiryDate defaults to executor's max allowance
        ) {
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }

    }

}
