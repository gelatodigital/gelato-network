import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task("test-canexec")
  .addPositionalParam("minttxhash")
  .setAction(async ({ minttxhash }) => {
    try {
      const execIdOneMintTxHash =
        "0xfd73c9b128b628b1ac95e1d07632694569a38226d57df135dff8f7b71abab0fb";
      const provider = await run("handleGelatoProvider");
      const user = await run("bre-config", {
        addressbookcategory: "userProxy",
        addressbookentry: "luis"
      });

      const condition = await run("bre-config", {
        deployments: true,
        contractname: "MockConditionDummy"
      });

      const action = await run("bre-config", {
        deployments: true,
        contractname: "MockActionDummy"
      });

      const execClaim = {
        id: utils.bigNumberify("1"),
        provider: "0x7015763d0a8F04263633106DE7a8F33B2334E51e",
        providerModule: "0xA6D02eFA927639EDAFB34A0AeC2Ebe1152a50713",
        user: "0xEA32a91261516b06Fe4917F7f248604b55d05cA8",
        condition: "0x16A6292aC4c568B8e70006C39ACf86fcee542Ef2",
        action: "0xd9dC553CDCf4ff237B5D6a7025c85f7F096705B4",
        conditionPayload: constants.HashZero,
        actionPayload: constants.HashZero,
        expiryDate: "0x5ecc1408",
        executorSuccessFeeFactor: 5,
        oracleSuccessFeeFactor: 2
      };

      const { execClaimHash } = await run("event-getparsedlog", {
        contractname: "GelatoCore",
        eventname: "LogExecClaimMinted",
        txhash: minttxhash,
        values: true
      });

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true
      });

      const gelatoGasPrice = await gelatoCore.gelatoGasPrice();
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();

      const canExecResult = await gelatoCore.canExec(
        execClaim,
        "0x51992e18c92053b7677003e2a86c5077a7ace82639873e8e63ef55ca806188fc",
        gelatoGasPrice,
        gelatoMaxGas
      );

      console.log(`\n CanExecResult:\n ${canExecResult}`);

      if (canExecResult === "Ok") {
        const execTx = await gelatoCore.exec(
          execClaim,
          "0x51992e18c92053b7677003e2a86c5077a7ace82639873e8e63ef55ca806188fc",
          { gasPrice: gelatoGasPrice, gasLimit: utils.bigNumberify("4000000") }
        );
        console.log(`\nExecTxHash: ${execTx.hash}\n`);

        const { blockHash: blockhash } = await execTx.wait();

        await run("event-getparsedlogsallevents", {
          contractname: "GelatoCore",
          txhash: execTx.hash,
          blockhash,
          log: true
        });
      }
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
