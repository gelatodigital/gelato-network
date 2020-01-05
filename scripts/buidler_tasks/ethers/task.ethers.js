import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { utils } from "ethers";

export default task(
  "ethers",
  `Return (or --log) properties of ethers-buidler plugin on [--network] (default: ${defaultNetwork})`
)
  .addFlag("address", "Use with --signer or --signers to log addresses")
  .addOptionalParam(
    "block",
    "Use with --signer --ethBalance to log balance at block height"
  )
  .addFlag("buidlerprovider", "Show the buidler-ethers provider")
  .addFlag("ethbalance", "Use with --signer to log Signer's ethBalance")
  .addFlag("log", "Logs return values to stdout")
  .addFlag("provider", "Show the buidler-ethers provider object")
  .addFlag(
    "signer",
    "Logs the default Signer Object configured by buidler-ethers"
  )
  .addFlag(
    "signers",
    "Logs the currently configured transaction buidler-ethers Signer objects"
  )
  .setAction(
    async ({
      address,
      block,
      buidlerprovider,
      ethbalance,
      log,
      provider,
      signer,
      signers
    }) => {
      try {
        const returnValues = [];

        if (buidlerprovider)
          returnValues.push(ethers.provider._buidlerProvider);

        if (provider) returnValues.push(ethers.provider);

        if (signer) {
          const signerInfo = await run("ethers:signer", {
            address,
            ethbalance,
            block
          });
          if (log && ethbalance)
            console.log(`\n${utils.formatEther(signerInfo[1])} ETH`);
          returnValues.push(signerInfo);
        }

        if (signers) {
          const signersInfo = await run("ethers:signers", { address });
          returnValues.push(signersInfo);
        }

        if (returnValues.length == 0) {
          if (log) console.log(ethers);
          return ethers;
        } else if (returnValues.length == 1) {
          if (log) console.log(returnValues[0]);
          return returnValues[0];
        } else {
          if (log) console.log("\nReturnValues:\n", returnValues, "\n");
          return returnValues;
        }
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  );
