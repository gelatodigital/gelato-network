pragma solidity ^0.6.2;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";

contract ActionRebalancePortfolio is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 700000;

    // !!!!!!!!! Kovan !!!!!!
    address public constant DAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;
    address public constant CONDITION_FEAR_GREED_INDEX_ADDRESS
        = 0x57e4025276e693e270EAE8900b94666e4721a657;
    address public constant GAS_PROVIDER = 0x99E69499973484a96639f4Fb17893BC96000b3b8;
    address public constant EXECUTOR = 0x99E69499973484a96639f4Fb17893BC96000b3b8;

    function action()
        external
        virtual
        returns(uint256)
    {
        IERC20 exchangeToken = IERC20(DAI);

        IFearGreedIndex fearGreedIndexContract = IFearGreedIndex(
            CONDITION_FEAR_GREED_INDEX_ADDRESS
        );

        // 1. Fetch Current fearGreedIndex
        uint256 fearGreedIndexNumerator = fearGreedIndexContract.getConditionValue();
        uint256 inverseFearGreedIndexNumerator = uint256(100).sub(fearGreedIndexNumerator);

        // 2. Calculate ETH's DAI Value
        IUniswapExchange uniswapExchange = getUniswapExchange(exchangeToken);

        uint256 ethAmountInDai = uniswapExchange.getTokenToEthInputPrice(
            address(this).balance
        );

        uint256 scalingFactor = uint256(100000);

        // 3. Calculate total portfolio value in DAI
        uint256 daiBalance = exchangeToken.balanceOf(address(this));
        uint256 totalDaiBalance = daiBalance.add(ethAmountInDai);

        // 4. Calculate weights without underflowing using scaling factor
        uint256 currentDaiWeight = uint256(scalingFactor).mul(daiBalance).div(
            totalDaiBalance
        );
        uint256 currentEthWeight = uint256(scalingFactor).sub(currentDaiWeight);

        // 5. Calculate the adjustment metrics
        // @DEV If no change is necessary, skip
        if (
            scalingFactor.mul(fearGreedIndexNumerator).div(100) >= currentDaiWeight
            && currentEthWeight >= scalingFactor.mul(inverseFearGreedIndexNumerator).div(
                100
            )
        ) {
            uint256 newDaiToAcquire
                = totalDaiBalance.mul(fearGreedIndexNumerator).div(100).sub(daiBalance);

            try uniswapExchange.ethToTokenSwapOutput{ value: address(this).balance }(
                newDaiToAcquire,
                now
            )
                returns(uint256 amountOfDaiAcquired)
            {
                mintChainedClaim(fearGreedIndexNumerator, exchangeToken);
                emit LogTwoWay(
                    address(this),  // origin
                    address(0),
                    address(this).balance,
                    DAI,  // destination
                    DAI,
                    amountOfDaiAcquired,
                    address(this)  // receiver
                );
                return amountOfDaiAcquired;
            } catch {
                revert("Error ethToTokenSwapOutput");
            }
        } else if (
            scalingFactor.mul(fearGreedIndexNumerator).div(100)
            <= currentDaiWeight && currentEthWeight
            <= scalingFactor.mul(inverseFearGreedIndexNumerator).div(100)
        ) {
            uint256 newEthToAcquire = totalDaiBalance.mul(inverseFearGreedIndexNumerator).div(100).sub(ethAmountInDai);

            try exchangeToken.approve(address(uniswapExchange), daiBalance) {
            } catch { revert("Approval failed"); }

            try uniswapExchange.tokenToEthSwapOutput(newEthToAcquire, daiBalance, now)
                returns(uint256 amountOfEthAcquired)
            {
                mintChainedClaim(fearGreedIndexNumerator, exchangeToken);

                emit LogTwoWay(
                address(this),  // origin
                address(0),
                daiBalance,
                DAI,  // destination
                DAI,
                amountOfEthAcquired,
                address(this)  // receiver
            );
                return amountOfEthAcquired;
            } catch {
                revert("Error ethToTokenSwapOutput");
            }
        } else {
            // Do nothing
            mintChainedClaim(fearGreedIndexNumerator, exchangeToken);
            emit LogTwoWay(
                address(this),  // origin
                address(0),
                0,
                DAI,  // destination
                DAI,
                0,
                address(this)  // receiver
            );
            return 0;
        }

    }


    /*
    address[2] calldata _selectedProviderAndExecutor,
    address[2] calldata _conditionAndAction,
    bytes calldata _conditionPayload,
    bytes calldata _actionPayload
    */
    function mintChainedClaim(uint256 _fearGreedIndexNumerator, IERC20 _exchangeToken)
        internal
    {
        bytes memory conditionPayload = abi.encodeWithSelector(
            bytes4(keccak256("reached(uint256)")),
            _fearGreedIndexNumerator
        );
        try getGelatoCore().mintExecutionClaim(
            [GAS_PROVIDER, EXECUTOR],
            [CONDITION_FEAR_GREED_INDEX_ADDRESS, address(this)],
            conditionPayload,
            abi.encodeWithSelector(this.action.selector)
        ) {
            // Take 1 % Fee for gas provider
            try _exchangeToken.transfer(
                GAS_PROVIDER,
                _exchangeToken.balanceOf(address(this)).div(100)
            ) {
            } catch {
                revert("Error: Could not take gas provider fee");
            }
        } catch {
            revert("Minting chainedClaim unsuccessful");
        }
    }

    function getGelatoCore()
        pure
        internal
        returns(IGelatoCore)
    {
        return IGelatoCore(address(0x4E2Ca0093028C8401C93AaCcCaF59288CA6fb728));
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
