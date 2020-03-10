pragma solidity ^0.6.2;

import "../GelatoActionsStandard.sol";
import "../../external/Ownable.sol";
import "../../external/IERC20.sol";
import "../../dapp_interfaces/fearAndGreedIndex/IFearGreedIndex.sol";
import "../../dapp_interfaces/uniswap/IUniswapFactory.sol";
import "../../dapp_interfaces/uniswap/IUniswapExchange.sol";
import "../../external/SafeMath.sol";
import "../../external/Address.sol";
import "../../gelato_core/interfaces/IGelatoCore.sol";

contract ActionRebalancePortfolio is GelatoActionsStandard, Ownable {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address;

    event Received(address indexed sender,  uint256 indexed value);

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override virtual returns(bytes4) {
        return this.action.selector;
    }

    uint256 public actionGas = 700000;
    function getActionGas() external view override virtual returns(uint256) {
        return actionGas;
    }
    function setActionGas(uint256 _actionGas) external virtual onlyOwner {
        actionGas = _actionGas;
    }

    uint256 public balance;

    // !!!!!!!!! Kovan !!!!!!
    address public constant DAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;
    address public constant CONDITION_FEAR_GREED_INDEX_ADDRESS
        = 0x7792AB86a89D653fb45fA64708fe5172eEbDB5C1;

    // function action(address _executor, address _gasProvider) external virtual returns(uint256) {
    function action() public virtual returns(uint256) {
        IERC20 exchangeToken = IERC20(DAI);

        IFearGreedIndex fearGreedIndexContract = IFearGreedIndex(
            CONDITION_FEAR_GREED_INDEX_ADDRESS
        );

        // 1. Fetch Current fearGreedIndex
        uint256 newDaiNum = fearGreedIndexContract.getConditionValue();
        uint256 daiBalance;
        uint256 totalDaiBalance;
        uint256 newDaiAmountWeighted;
        uint256 oldDaiAmountWeighted;


        // 2. Calculate ETH's DAI Value
        IUniswapExchange uniswapExchange = getUniswapExchange(exchangeToken);

        uint256 ethAmountInDai;
        {
            uint256 ethBalance = address(this).balance;
            if (ethBalance != 0)
            {
                try uniswapExchange.getEthToTokenInputPrice(ethBalance)
                returns(uint256 returnEth)
                {
                    ethAmountInDai = returnEth;
                } catch {
                    revert("Error: getEthToTokenInputPrice");
                }
            }
        }

        // 3. Calculate total portfolio value in DAI

        daiBalance = exchangeToken.balanceOf(address(this));
        totalDaiBalance = daiBalance.add(ethAmountInDai);

        // 4. Calculate weights without underflowing using scaling factor
        // @DEV If no change is necessary, skip
        // Find out if new DAI weight is greater than old DAI weight, and if so, sell ETH, otherwise sell DAI
        // IF e.g. 100 * 80 / 100 > 100 * 10000000 / 20000000 => Sell ETH for DAI
        newDaiAmountWeighted = totalDaiBalance.mul(newDaiNum).div(100, "ActionRebalancePortfolio._action: newDaiWeight underflow");

        oldDaiAmountWeighted = totalDaiBalance.mul(daiBalance).div(totalDaiBalance, "ActionRebalancePortfolio._action: newDaiWeight underflow");

        // What happens if DAI Balance === 0? => Should be fine

        if (newDaiAmountWeighted == oldDaiAmountWeighted) {
            // skip rebalancing, portfolio has correct weights
            emit LogTwoWay(
                    address(this),  // origin
                    address(0),
                    address(this).balance,
                    DAI,  // destination
                    DAI,
                    0,
                    address(this)  // receiver
                );
        }
        // Portfolio needs to acquire more DAI
        else if (
            newDaiAmountWeighted > oldDaiAmountWeighted
        ) {
            // uint256 howMuchEthToKeepDaiDenominated =  ethAmountInDai.sub(newDaiAmountWeighted, "ActionRebalancePortfolio._action: howMuchEthToKeepDaiDenominated underflow");

            // uint256 howMuchEthToSellDaiDenominated =  ethAmountInDai.sub(howMuchEthToKeepDaiDenominated, "ActionRebalancePortfolio._action: howMuchEthToKeepDaiDenominated underflow");

            uint256 newEthPortfolioWeight = totalDaiBalance.mul(100 - newDaiNum).div(100, "ActionRebalancePortfolio._action: newEthPortfolioWeight underflow");

            uint256 howMuchEthToSellDaiDenominated =  ethAmountInDai.sub(newEthPortfolioWeight, "ActionRebalancePortfolio._action: howMuchEthToSellDaiDenominated underflow");

            uint256 howMuchEthToSellEthDenominated = address(this).balance.mul(howMuchEthToSellDaiDenominated).div(ethAmountInDai, "ActionRebalancePortfolio._action: howMuchEthToSellEthDenominated underflow");

            try uniswapExchange.ethToTokenSwapInput{ value: howMuchEthToSellEthDenominated }(
                howMuchEthToSellDaiDenominated,
                now
            )
                returns(uint256 amountOfDaiAcquired)
            {
                // mintChainedClaim(newDaiNum, exchangeToken, _executor);
                emit LogTwoWay(
                    address(this),  // origin
                    address(0),
                    address(this).balance,
                    DAI,  // destination
                    DAI,
                    amountOfDaiAcquired,
                    address(this)  // receiver
                );
            } catch {
                revert("Error ethToTokenSwapOutput");
            }
        }
        // Portfolio needs to acquire more ETH
        else if (
            newDaiAmountWeighted < oldDaiAmountWeighted
        ) {
            // Calculate how much DAI needs to be sold
            uint256 howMuchDaiToSell = daiBalance.sub(newDaiAmountWeighted, "ActionRebalancePortfolio._action: howMuchDaiToSell underflow");

            try exchangeToken.approve(address(uniswapExchange), howMuchDaiToSell) {
            } catch { revert("Approval failed"); }

            // min ETH return can be 1, as we fetch the price atomically anyway.
            try uniswapExchange.tokenToEthSwapInput(howMuchDaiToSell, 1, now)
                returns(uint256 amountOfEthAcquired)
            {
            //     mintChainedClaim(newDaiNum, exchangeToken, _executor);

                emit LogTwoWay(
                address(this),  // origin
                address(0),
                daiBalance,
                DAI,  // destination
                DAI,
                amountOfEthAcquired,
                address(this)  // receiver
            );
            } catch {
                revert("Error ethToTokenSwapOutput");
            }
        }
        return newDaiNum;
    }


    function getGelatoCore()
        pure
        internal
        returns(IGelatoCore)
    {
        return IGelatoCore(0x45F205Eb29310B6Fb92893d938Cc1738001210e8);
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
        IUniswapExchange uniswapExchange = uniswapFactory.getExchange(_token);
        require(uniswapExchange != IUniswapExchange((0)), "Could not find DAI exchange");
        return uniswapExchange;
    }

}

