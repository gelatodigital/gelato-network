pragma solidity ^0.6.3;

import "../GelatoActionsStandard.sol";
import "../../gelato_core/interfaces/IGnosisSafe.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";
import "../../gelato_core/interfaces/IGelatoUserProxyFactory.sol";
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

/// @title ScriptExitRebalancePortfolioKovan
/// @notice Script to be run when exitting ActionChaninedRebalancePorfolio
contract ScriptExitRebalancePortfolioKovan {
    /*is GelatoActionsStandard*/
    using SafeMath for uint256;
    using Address for address payable;

    event LogTwoWay(
        address origin,
        address sendToken,
        uint256 sendAmount,
        address destination,
        address receiveToken,
        uint256 receiveAmount,
        address receiver
    );

    event LogExit();

    // !!!!!!!!! Kovan !!!!!!
    // DAI
    IERC20 public constant exchangeToken = IERC20(
        0xC4375B7De8af5a38a93548eb8453a498222C4fF2
    );

    // Uniswap Factory
    IUniswapFactory public constant uniswapFactory = IUniswapFactory(
        0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30
    );

    // GelatoCore
    IGelatoCore public constant gelatoCore = IGelatoCore(
        0x4e4f3d95CC4920f1D6e8fb433a9Feed3C8f3CC31
    );

    event LogFailure(string error);

    /// @dev This function should be delegatecalled
    function exitRebalancingPortfolio(
        address payable _withdrawAddress,
        address[2] calldata _selectedProviderAndExecutor,
        uint256 _executionClaimId,
        address[2] calldata _conditionAndAction,
        bytes calldata _conditionPayload,
        bytes calldata _actionPayload,
        uint256 _executionClaimExpiryDate
    )
        external
    {
        // 1. Withdraw all DAI to owner if there is balance
        uint256 safeOwnerDaiBalance = exchangeToken.balanceOf(address(this));
        if ( safeOwnerDaiBalance > 0 ) {

            IUniswapExchange uniswapExchange = getUniswapExchange(exchangeToken);
            //  Check that uniswapExchange exists
            if (address(uniswapExchange) != address(0)) {

                // Convert DAI to ETH
                try exchangeToken.approve(
                    address(uniswapExchange),
                    safeOwnerDaiBalance
                    ) {} catch { revert("Approval failed"); }

                // min ETH return can be 1, as we fetch the price atomically anyway.
                try uniswapExchange.tokenToEthTransferInput(
                    safeOwnerDaiBalance,
                    1,
                    now,
                    _withdrawAddress
                )
                returns (uint256 amountOfEthAcquired) {
                    emit LogTwoWay(
                        address(this),  // origin
                        address(exchangeToken), // sendToken
                        safeOwnerDaiBalance, // sendAmount
                        address(uniswapExchange),  // destination
                        address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE), // receiveToken
                        amountOfEthAcquired, // receiveAmount
                        address(this)  // receiver
                    );

                } catch {
                    revert("Error tokenToEthSwapInput");
                }

            }
        }

        // 2. Withdraw all remaining ether to withdrawAddress
        uint256 etherBalance = address(this).balance;
        if (etherBalance > 0) _withdrawAddress.sendValue(etherBalance);


        // 3. Cancel Execution Claim
        try gelatoCore.cancelExecutionClaim(
            _selectedProviderAndExecutor,
            _executionClaimId,
            address(this),
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

        emit LogExit();
    }

    // Returns KOVAN uniswap factory
    function getUniswapExchange(IERC20 _token)
        internal
        view
        returns(IUniswapExchange)
    {
        IUniswapExchange uniswapExchange = uniswapFactory.getExchange(_token);
        require(uniswapExchange != IUniswapExchange((0)), "Could not find exchangeToken exchange");
        return uniswapExchange;
    }
}
