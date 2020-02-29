pragma solidity ^0.6.2;

import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IGelatoCore.sol";
import "../interfaces/IGelatoUserProxyFactory.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
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
contract CancelPortfolioRebalancing {

    using SafeMath for uint256;
    using Address for address payable;

    // !!!!!!!!! Kovan !!!!!!
    address public constant DAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;

    event LogFailure(string error);


    /// @dev This function should be delegatecalled
    function cancelPortfolioRebalancingAndWithdraw(
        address _gelatoCore,
        address[2] calldata _providerAndExecutor,
        uint256 _executionClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
    {
        IERC20 exchangeToken = IERC20(DAI);
        uint256 safeOwnerDaiBalance = exchangeToken.balanceOf(address(this));

        // 1. Withdraw all ETH to owner
        address safeOwner = IGelatoUserProxyFactory(_gelatoCore).userByGelatoProxy(
            address(this)
        );
        address payable payableOwner = address(uint160(safeOwner));
        // safeOwner.toPayable()
        if(address(this).balance > 0) payableOwner.sendValue(address(this).balance);


        // 2. Withdraw all DAI to owner if there is balance
        if(safeOwnerDaiBalance > 0) {
            // try exchangeToken.transfer(safeOwner, safeOwnerDaiBalance){}
            // catch{revert("failed to send remaining DAI");}

            // Convert DAI to ETH
            try getUniswapExchange(exchangeToken).tokenToEthTransferInput(
                safeOwnerDaiBalance,
                1,
                now,
                safeOwner
            ) {
            } catch {
                revert("Error tokenToEthTransferInput");
            }
        }

        // 3. Cancel Execution Claim
        try IGelatoCore(_gelatoCore).cancelExecutionClaim(
            _providerAndExecutor,
            _executionClaimId,
            _userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _executionClaimExpiryDate
        )  {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("cancelExecutionClaim error");
        }

    }

     // Returns KOVAN uniswap factory
    function getUniswapExchange(IERC20 _token)
        internal
        view
        returns(IUniswapExchange)
    {
        IUniswapFactory uniswapFactory = IUniswapFactory(
            0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30
        );
        uniswapFactory.getExchange(_token);
    }
}