import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { utils } from "ethers";
import Action from "../../../../src/classes/gelato/Action";

export default task("swap-uni", `Swaps tokens on Uniswap`)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ src, dest, srcamt, log }) => {
    try {
      const sellAmount = utils.parseUnits("5", "18");
      const buyTokenAddress = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: "WETH",
      });
      const minBuyAmount = 0;

      const user = getUser();
      const origin = await user.getAddress();
      const receiver = origin;

      // Read Instance of KyberContract
      const sellTokenAddress = await run("bre-config", {
        addressbookcategory: "erc20",
        addressbookentry: "DAI",
      });
      const sellToken = await run("instantiateContract", {
        contractname: "IERC20",
        contractaddress: sellTokenAddress,
        write: true,
        signer: user,
      });

      const actionUniswapTrade = await run("instantiateContract", {
        contractname: "ActionUniswapV2Trade",
        write: true,
        deployments: true,
        signer: user,
      });

      // 1. Find User Proxy
      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        write: true,
        deployments: true,
        signer: user,
      });

      const proxiesByUser = await gelatoUserProxyFactory.gelatoProxiesByUser(
        origin
      );
      console.log(proxiesByUser);

      if (proxiesByUser.length === 0)
        throw Error("Create a Gelato user proxy first!");

      const gelatoUserProxy = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: proxiesByUser[0],
        write: true,
        signer: user,
      });

      const action = new Action({
        addr: actionUniswapTrade.address,
        data: await actionUniswapTrade.getActionData(
          sellTokenAddress,
          sellAmount,
          buyTokenAddress,
          minBuyAmount,
          receiver,
          origin
        ),
        termsOkCheck: false,
        value: 0,
        dataFlow: DataFlow.None,
        operation: Operation.Delegatecall,
      });

      // 1. Approve ERC20 contract for sell amount
      const approveTx = await sellToken.approve(
        gelatoUserProxy.address,
        sellAmount
      );
      console.log(approveTx.hash);
      await approveTx.wait();

      // 2. Sell on Uniswap
      let currentNonce = await ethers.provider.getTransactionCount(
        await user.getAddress()
      );
      const sellOnUniswapTx = await gelatoUserProxy.execAction(action, {
        gasPrice: 100000000000,
        nonce: currentNonce,
      });
      await sellOnUniswapTx.wait();
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
