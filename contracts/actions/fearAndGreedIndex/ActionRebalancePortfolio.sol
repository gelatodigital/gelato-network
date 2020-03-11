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
    using Address for address payable;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return this.action.selector;
    }

    uint256 public actionGas = 700000;

    function getActionGas() external view override virtual returns(uint256) {
        return actionGas;
    }
    function setActionGas(uint256 _actionGas) external virtual onlyOwner {
        actionGas = _actionGas;
    }

    // !!!!!!!!! Kovan !!!!!!
    // DAI
    IERC20 public constant exchangeToken = IERC20(0xC4375B7De8af5a38a93548eb8453a498222C4fF2);
    address public constant CONDITION_FEAR_GREED_INDEX_ADDRESS
        = 0x7792AB86a89D653fb45fA64708fe5172eEbDB5C1;

    // function action(address _executor, address _gasProvider) external virtual returns(uint256) {
    function action(address payable _provider) public virtual returns(uint256) {

        IFearGreedIndex fearGreedIndexContract = IFearGreedIndex(
            CONDITION_FEAR_GREED_INDEX_ADDRESS
        );

        uint256 newDaiNum;
        uint256 daiBalance;
        uint256 totalDaiBalance;
        uint256 newDaiAmountWeighted;
        uint256 oldDaiAmountWeighted;

        // 1. Calculate ETH's DAI Value
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

        // 2. Fetch Current fearGreedIndex
        try fearGreedIndexContract.getConditionValue()
        returns(uint256 _newDaiNum)
        {
            require(_newDaiNum >= 0 && _newDaiNum <= 100, "_newDaiNum has to be between 0 and 100");
            newDaiNum = _newDaiNum;
        }
        catch{revert("ActionRebalancePortfolio: fearGreedIndexContract.getConditionValue");}


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
                    address(exchangeToken),  // destination
                    address(exchangeToken),
                    0,
                    address(this)  // receiver
                );
        }
        // Portfolio )needs to acquire more exchangeToken
        else if (
            newDaiAmountWeighted > oldDaiAmountWeighted
        ) {
            // uint256 howMuchEthToKeepDaiDenominated =  ethAmountInDai.sub(newDaiAmountWeighted, "ActionRebalancePortfolio._action: howMuchEthToKeepDaiDenominated underflow");

            // uint256 howMuchEthToSellDaiDenominated =  ethAmountInDai.sub(howMuchEthToKeepDaiDenominated, "ActionRebalancePortfolio._action: howMuchEthToKeepDaiDenominated underflow");

            uint256 newEthPortfolioWeight = totalDaiBalance.mul(100 - newDaiNum).div(100, "ActionRebalancePortfolio._action: newEthPortfolioWeight underflow");

            uint256 howMuchEthToSellDaiDenominated =  ethAmountInDai.sub(newEthPortfolioWeight, "ActionRebalancePortfolio._action: howMuchEthToSellDaiDenominated underflow");

            uint256 howMuchEthToSellEthDenominated = address(this).balance.mul(howMuchEthToSellDaiDenominated).div(ethAmountInDai, "ActionRebalancePortfolio._action: howMuchEthToSellEthDenominated underflow");

            // Provider receives 0.3% fee
            uint256 fee = howMuchEthToSellEthDenominated.div(3000, "ActionRebalancePortfolio._action: eth fee underflow");

            _provider.sendValue(fee);

            try uniswapExchange.ethToTokenSwapInput{ value: howMuchEthToSellEthDenominated.sub(fee, "ActionRebalancePortfolio._action: eth fee underflow 2") }(
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
                    address(exchangeToken),  // destination
                    address(exchangeToken),
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
            // Calculate how much exchangeToken needs to be sold
            uint256 howMuchDaiToSell = daiBalance.sub(newDaiAmountWeighted, "ActionRebalancePortfolio._action: howMuchDaiToSell underflow");

            // Provider receives 0.3% fee
            uint256 fee = howMuchDaiToSell.div(3000, "ActionRebalancePortfolio._action: dai fee underflow");
            exchangeToken.transfer(_provider, fee);

            try exchangeToken.approve(address(uniswapExchange), howMuchDaiToSell.sub(fee, "ActionRebalancePortfolio._action: howMuchDaiToSellSubFee underflow1")) {
            } catch { revert("Approval failed"); }

            // min ETH return can be 1, as we fetch the price atomically anyway.
            try uniswapExchange.tokenToEthSwapInput(howMuchDaiToSell.sub(fee, "ActionRebalancePortfolio._action: howMuchDaiToSellSubFee underflow2"), 1, now)
                returns(uint256 amountOfEthAcquired)
            {
            //     mintChainedClaim(newDaiNum, exchangeToken, _executor);

                emit LogTwoWay(
                address(this),  // origin
                address(0),
                daiBalance,
                address(exchangeToken),  // destination
                address(exchangeToken),
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
        return IGelatoCore(0x35b9b372cF07B2d6B397077792496c61721B58fa);
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

