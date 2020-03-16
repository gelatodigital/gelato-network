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

contract ActionRebalancePortfolioKovan is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using SafeMath for uint256;
    using Address for address payable;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return this.action.selector;
    }

    // !!!!!!!!! Kovan Constants !!!!!!!!!!

    // DAI
    IERC20 public constant exchangeToken = IERC20(
        0xC4375B7De8af5a38a93548eb8453a498222C4fF2)
    ;

    // Oracle
    IFearGreedIndex public constant fearGreedIndexContract = IFearGreedIndex(
            0xf5aF30e4022698314e07514CE649fa7f45Cc8F87
    );

    // Gelato Core
    IGelatoCore public constant gelatoCore = IGelatoCore(
        0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2)
    ;

    // Uniswap Factory
    IUniswapFactory public constant uniswapFactory = IUniswapFactory(
            0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30
    );

    // Uniswap Factory
    address payable public constant provider = 0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8;

    // Fee denominator = 0.3%
    uint256 public constant feeDenomiator = 3000;

    // !!!!!!!!! Kovan Constants END !!!!!!!!!!

    function action()
        public
        virtual
        returns(uint256 newDaiNum)
    {

        uint256 totalDaiBalance;
        uint256 newDaiAmountWeighted;
        uint256 oldDaiAmountWeighted;
        uint256 daiBalance = exchangeToken.balanceOf(address(this));

        // 1. Calculate ETH's DAI Value
        IUniswapExchange uniswapExchange = getUniswapExchange(exchangeToken);

        uint256 ethAmountInDai;
        {
            uint256 ethBalance = address(this).balance;
            require(ethBalance != 0 || daiBalance != 0, "ActionRebalancePortfolioKovan: User requires either DAI or ETH balance");
            if (ethBalance != 0)  {
                try uniswapExchange.getEthToTokenInputPrice(ethBalance)
                returns(uint256 returnEth) {
                    ethAmountInDai = returnEth;
                } catch {
                    revert("Error: getEthToTokenInputPrice");
                }
            }
        }

        // 2. Fetch Current fearGreedIndex
        try fearGreedIndexContract.getConditionValue()
        returns(uint256 _newDaiNum) {
            require(_newDaiNum >= 0 && _newDaiNum <= 100, "_newDaiNum has to be between 0 and 100");
            newDaiNum = _newDaiNum;
        } catch {
            revert("ActionRebalancePortfolioKovan: fearGreedIndexContract.getConditionValue");
        }


        // 3. Calculate total portfolio value in DAI
        daiBalance = exchangeToken.balanceOf(address(this));
        totalDaiBalance = daiBalance.add(ethAmountInDai);

        // 4. Calculate weights without underflowing using scaling factor
        // Find out if new DAI weight is greater than old DAI weight, and if so, sell ETH, otherwise sell DAI
        // IF e.g. 100 * 80 / 100 > 100 * 10000000 / 20000000 => Sell ETH for DAI
        newDaiAmountWeighted = totalDaiBalance.mul(newDaiNum).div(
            100, "ActionRebalancePortfolioKovan._action: newDaiWeight underflow"
        );

        oldDaiAmountWeighted = totalDaiBalance.mul(
            daiBalance
        ).div(
            totalDaiBalance, "ActionRebalancePortfolioKovan._action: newDaiWeight underflow"
        );

        // What happens if DAI Balance === 0? => Should be fine

        if (newDaiAmountWeighted == oldDaiAmountWeighted) {
            // skip rebalancing, portfolio has correct weights
        }  else if (newDaiAmountWeighted > oldDaiAmountWeighted) {
            // Portfolio needs to acquire more exchangeToken
            uint256 newEthPortfolioWeight = totalDaiBalance.mul(
                100 - newDaiNum)
            .div(
                100, "ActionRebalancePortfolioKovan._action: newEthPortfolioWeight underflow"
            );

            uint256 howMuchEthToSellDaiDenominated =  ethAmountInDai.sub(
                newEthPortfolioWeight, "ActionRebalancePortfolioKovan._action: howMuchEthToSellDaiDenominated underflow"
            );

            uint256 howMuchEthToSellEthDenominated = address(this).balance.mul(
                howMuchEthToSellDaiDenominated
            ).div(
                ethAmountInDai, "ActionRebalancePortfolioKovan._action: howMuchEthToSellEthDenominated underflow"
            );

            // Provider receives 0.3% fee
            uint256 fee = howMuchEthToSellEthDenominated.div(
                feeDenomiator, "ActionRebalancePortfolioKovan._action: eth fee underflow"
            );

            provider.sendValue(fee);

            try uniswapExchange.ethToTokenSwapInput{ value: howMuchEthToSellEthDenominated.sub(
                fee, "ActionRebalancePortfolioKovan._action: eth fee underflow 2"
            ) }(
                // Amount we are exepected to get back
                howMuchEthToSellDaiDenominated.sub(
                    howMuchEthToSellDaiDenominated.div(
                        feeDenomiator, "ActionRebalancePortfolioKovan._action: eth fee underflow 3"
                    ),
                    "ActionRebalancePortfolioKovan._action: eth fee underflow 4"
                ),
                // Deadline
                now
            )
            returns(uint256 amountOfDaiAcquired) {
                emit LogTwoWay(
                    address(this),  // origin
                    address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE), // sendToken
                    howMuchEthToSellEthDenominated.sub(fee), // sendAmount
                    address(uniswapExchange),  // destination
                    address(exchangeToken), // receiveToken
                    amountOfDaiAcquired, // receiveAmount
                    address(this)  // receiver
                );
            } catch {
                revert("Error ethToTokenSwapInput");
            }
        }  else if (newDaiAmountWeighted < oldDaiAmountWeighted) {
            // Portfolio needs to acquire more ETH

            // Calculate how much exchangeToken needs to be sold
            uint256 howMuchDaiToSell = daiBalance.sub(
                newDaiAmountWeighted, "ActionRebalancePortfolioKovan._action: howMuchDaiToSell underflow"
            );

            // Provider receives 0.3% fee
            uint256 fee = howMuchDaiToSell.div(
                feeDenomiator, "ActionRebalancePortfolioKovan._action: dai fee underflow"
            );

            // Pay provider
            exchangeToken.transfer(provider, fee);

            try exchangeToken.approve(
                address(uniswapExchange),
                howMuchDaiToSell.sub(
                    fee, "ActionRebalancePortfolioKovan._action: howMuchDaiToSellSubFee underflow1"
                    )
                ) {} catch { revert("Approval failed"); }

            // min ETH return can be 1, as we fetch the price atomically anyway.
            try uniswapExchange.tokenToEthSwapInput(
                howMuchDaiToSell.sub(
                    fee, "ActionRebalancePortfolioKovan._action: howMuchDaiToSellSubFee underflow2"
                ),
                1,
                now)
            returns (uint256 amountOfEthAcquired) {
                emit LogTwoWay(
                    address(this),  // origin
                    address(exchangeToken), // sendToken
                    howMuchDaiToSell.sub(fee), // sendAmount
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

