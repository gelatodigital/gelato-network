// Buidler config
import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../../../buidler.config";
import sleep from "../../../../../../helpers/async/sleep";

// Javascript Ethereum API Library
import { Contract, utils } from "ethers";

export default task(
  "gelato-action-multimint",
  `TX to ActionMultiMintForTriggerTimestampPassed on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }) => {
    try {
      // To avoid mistakes default log to true
      log = true;

      // Initialize provider and signer
      const provider = ethers.provider;
      const [signer] = await ethers.signers();

      const blockNumber = await provider.getBlockNumber();
      if (log)
        console.log(
          `\nCurrent block number on ${network.name}: ${blockNumber}\n`
        );

      // Contract Addresses
      const {
        ActionKyberTrade: actionKyberTradeAddress,
        ActionMultiMintForTriggerTimestampPassed: actionMultiMintTimeTriggerAddress,
        GelatoCore: gelatoCoreAddress,
        TriggerTimestampPassed: triggerTimestampPassedAddress
      } = await run("bre-config", { deployments: true });

      const userProxyAddress = await run("gelato-core-getproxyofuser");

      // Encode the specific params for ActionKyberTrade
      const actionKyberTradePayloadWithSelector = await run(
        "gelato-core-mint:defaultpayloads:ActionKyberTrade",
        { log }
      );

      // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
      const actionMultiMintForTriggerTimestampPassedPayloadWithSelector = await run(
        "gelato-core-mint:defaultpayload:ActionMultiMintForTriggerTimestampPassed",
        {
          log
        }
      );

      // Getting the current Ethereum price
      const ethUSDPrice = await run("eth-price");
      if (log) console.log(`\nETH-USD: ${ethUSDPrice} $`);

      // ReadInstance of GelatoCore
      const gelatoCoreABI = await run("abi-get", {
        contractname: "GelatoCore"
      });
      const gelatoCoreContract = new Contract(
        gelatoCoreAddress,
        gelatoCoreABI,
        provider
      );
      const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
        SELECTED_EXECUTOR_ADDRESS,
        triggerTimestampPassedAddress,
        actionKyberTradeAddress
      );
      if (log)
        console.log(
          `\nMinting Deposit Per Mint: ${utils.formatUnits(
            MINTING_DEPOSIT_PER_MINT,
            "ether"
          )} ETH \t\t${ethUSDPrice *
            parseFloat(utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether"))} $`
        );

      const MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
      if (log)
        console.log(
          `\nMinting Deposit for ${NUMBER_OF_MINTS} mints: ${utils.formatUnits(
            MSG_VALUE,
            "ether"
          )} ETH \t ${ethUSDPrice *
            parseFloat(utils.formatUnits(MSG_VALUE, "ether"))} $`
        );

      // send tx to PAYABLE contract method
      // Read-Write Instance of UserProxy
      const userProxyABI = [
        "function delegatecall(address _account, bytes _payload) external payable returns(bool success, bytes returndata)"
      ];
      const userProxyContract = new Contract(
        userProxyAddress,
        userProxyABI,
        signer
      );
      const tx = await userProxyContract.delegatecall(
        actionMultiMintTimeTriggerAddress,
        actionMultiMintForTriggerTimestampPassedPayloadWithSelector,
        {
          value: MSG_VALUE,
          gasLimit: 3500000
        }
      );
      if (log)
        console.log(
          `\nuserProxy.executeDelegatecall(multiMintForTimeTrigger) txHash:\n${tx.hash}`
        );
      if (log) console.log("\nwaiting for transaction to get mined\n");
      const txReceipt = await tx.wait();

      await run("erc20-approve", {
        erc20address: src,
        spender: userProxyAddress,
        amount: SRC_AMOUNT.mul(NUMBER_OF_MINTS),
        log
      });

      return txReceipt;
    } catch (err) {
      console.log(err);
    }
  });
