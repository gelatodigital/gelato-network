// Buidler config
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";

// Javascript Ethereum API Library
import { utils } from "ethers";

export default task(
  "gelato-action-multimint",
  `TX to ActionMultiMintForTriggerTimestampPassed on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      if (log) await run("block-number", { log });

      // Contract Addresses
      const {
        ActionMultiMintForTriggerTimestampPassed: actionMultiMintTimeTriggerAddress
      } = await run("bre-config", { deployments: true });

      // Params for ActionMultiMintForTriggerTimestampPassed
      const { default: SELECTED_EXECUTOR_ADDRESS } = await run("bre-config", {
        addressbookcategory: "executor",
        log
      });
      const SRC_AMOUNT = utils.parseUnits("10", 18);
      const NUMBER_OF_MINTS = "2";

      // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
      const actionMultiMintForTriggerTimestampPassedPayloadWithSelector = await run(
        "gelato-core-mint:defaultpayload:ActionMultiMintForTriggerTimestampPassed",
        {
          log
        }
      );

      // ReadInstance of GelatoCore
      const mintinDepositPerMint = await run(
        "gelato-core-getmintingdepositpayable",
        {
          selectedexecutor: SELECTED_EXECUTOR_ADDRESS,
          triggername: "TriggerTimestampPassed",
          actionname: "ActionKyberTrade",
          log
        }
      );

      // MSG VALUE for payable mint function
      const msgValue = mintinDepositPerMint.mul(NUMBER_OF_MINTS);

      if (log) {
        const msgValueETH = utils.formatUnits(msgValue, "ether");
        const ethUSDPrice = await run("eth-price");
        const msgValueUSD = (ethUSDPrice * parseFloat(msgValueETH)).toFixed(2);
        console.log(
          `\nMinting Deposit for ${NUMBER_OF_MINTS} mints: ${msgValueETH}ETH (${msgValueUSD}$)\n`
        );
      }

      // send tx to PAYABLE contract method
      // Read-Write Instance of UserProxy
      const { luis: userProxyAddress } = await run("bre-config", {
        addressbookcategory: "userProxy"
      });
      const userProxyContract = await run("instantiateContract", {
        contractname: "GelatoUserProxy",
        contractaddress: userProxyAddress,
        write: true
      });

      // ❗Send TX To MultiMint
      const multiMintTx = await userProxyContract.delegatecall(
        actionMultiMintTimeTriggerAddress,
        actionMultiMintForTriggerTimestampPassedPayloadWithSelector,
        {
          value: msgValue,
          gasLimit: 3500000
        }
      );
      if (log)
        console.log(
          `\nuserProxy.executeDelegatecall(multiMintForTimeTrigger) txHash:\n${multiMintTx.hash}`
        );
      if (log) console.log("\nwaiting for transaction to get mined\n");

      // Wait for TX to get mined
      await multiMintTx.wait();

      // Automatic ERC20 Approval
      if (log) console.log("\nCaution: ERC20 Approval for userProxy needed\n");
      /*await run("erc20-approve", {
        erc20address: src,
        spender: userProxyAddress,
        amount: SRC_AMOUNT.mul(NUMBER_OF_MINTS),
        log
      });*/

      return multiMintTx.hash;
    } catch (err) {
      console.log(err);
    }
  });
