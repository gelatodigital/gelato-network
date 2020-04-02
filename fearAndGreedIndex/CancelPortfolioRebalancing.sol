pragma solidity ^0.6.4;

import "../../gelato_core/gelato_user_proxies/gnosis_safe_proxy/interfaces/IGnosisSafe.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";
//import "../../gelato_core/interfaces/IGelatoUserProxyFactory.sol";
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

    /*using SafeMath for uint256;
    using Address for address payable;

    // !!!!!!!!! Kovan !!!!!!
    address public constant DAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;

    event LogFailure(string error);


    /// @dev This function should be delegatecalled
    function cancelPortfolioRebalancingAndWithdraw(
        address _gelatoCore,
        address[2] calldata _gelatoProviderAndExecutor,
        uint256 _execClaimId,
        address _userProxy,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _execClaimExpiryDate
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

        // 3. Cancel Exec Claim
        try IGelatoCore(_gelatoCore).cancelExecClaim(
            _gelatoProviderAndExecutor,
            _execClaimId,
            _userProxy,
            _conditionAndAction,
            _conditionPayload,
            _actionPayload,
            _execClaimExpiryDate
        )  {
        } catch Error(string memory error) {
            emit LogFailure(error);
        } catch {
            emit LogFailure("cancelExecClaim error");
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
    }*/
}