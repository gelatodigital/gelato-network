import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gsp-exectransaction",
  `Sends a tx to gnosisSafeProxy.execTransaction() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gnosissafeproxyaddress",
    "The address of the gnosis safe proxy we call"
  )
  .addPositionalParam("contractname", "The contract whose abi has the function")
  .addOptionalVariadicPositionalParam(
    "inputs",
    "The parameters for --functionname or for the defaultpayloadscript for <contractname>"
  )
  .addOptionalParam(
    "to",
    "The address which to call/delegatecall. Defaults to <contractname>"
  )
  .addOptionalParam("functionname", "The function we want to call")
  .addOptionalParam(
    "data",
    "The data for the call --to. If not --functioname, defaults to <contractname> defaultpayload is used."
  )
  .addOptionalParam(
    "value",
    "The value to sent along with the tx",
    constants.HashZero
  )
  .addOptionalParam(
    "operation",
    "0-Call or 1-Delegatecall to <to>",
    0,
    types.int
  )
  .addOptionalParam(
    "safetxgas",
    "Max gas for relay service. 0 for gasleft or no relay",
    constants.HashZero
  )
  .addOptionalParam(
    "basegas",
    "BaseGas for relay refund calculations. 0 for no relay.",
    0,
    types.int
  )
  .addOptionalParam(
    "gasprice",
    "The gasprice for relayer service. 0 for no relay.",
    constants.HashZero
  )
  .addOptionalParam(
    "gastoken",
    "For relay service refund in token. 0x0 for no relay",
    constants.AddressZero
  )
  .addOptionalParam(
    "refundreceiver",
    "Relay service payee. 0x0 for no relay.",
    constants.AddressZero
  )
  .addOptionalParam(
    "signatures",
    "Packed signature data ({bytes32 r}{bytes32 s}{uint8 v}). Defaults to pre-validated signature for msg.sender == owner"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // DEFAULT VALUES due to Buidler BUG
      if (!taskArgs.value) taskArgs.value = constants.HashZero;
      if (!taskArgs.safetxgas) taskArgs.safetxgas = constants.HashZero;
      if (!taskArgs.basegas) taskArgs.basegas = 0;
      if (!taskArgs.gasprice) taskArgs.gasprice = constants.HashZero;
      if (!taskArgs.gastoken) taskArgs.gastoken = constants.AddressZero;
      if (!taskArgs.refundreceiver)
        taskArgs.refundreceiver = constants.AddressZero;
      // taskArgs sanitzation
      if (taskArgs.functionname && taskArgs.data)
        throw new Error("Provide EITHER --functionname OR --data");

      if (!taskArgs.inputs) taskArgs.inputs = [];

      // --to address defaults to Contractname
      if (!taskArgs.to) {
        taskArgs.to = await run("bre-config", {
          deployments: true,
          contractname: taskArgs.contractname,
        });
      }

      if (!taskArgs.functionname && !taskArgs.data) {
        taskArgs.data = await run(
          `gsp:scripts:defaultpayload:${taskArgs.contractname}`,
          {
            inputs: taskArgs.inputs,
          }
        );
      } else if (taskArgs.functionname && !taskArgs.data) {
        taskArgs.data = await run("abi-encode-withselector", {
          contractname: taskArgs.contractname,
          functionname: taskArgs.functionname,
          inputs: taskArgs.inputs,
        });
      }

      const signerAddr = await run("ethers", { signer: true, address: true });

      if (!taskArgs.signatures) {
        taskArgs.signatures = `0x000000000000000000000000${signerAddr.replace(
          "0x",
          ""
        )}000000000000000000000000000000000000000000000000000000000000000001`;
      }

      if (taskArgs.log) console.log(taskArgs);

      const gnosisSafeProxy = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: taskArgs.gnosissafeproxyaddress,
        write: true,
      });

      let executeTx;
      try {
        executeTx = await gnosisSafeProxy.execTransaction(
          taskArgs.to,
          taskArgs.value,
          taskArgs.data,
          taskArgs.operation,
          taskArgs.safetxgas,
          taskArgs.basegas,
          taskArgs.gasprice,
          taskArgs.gastoken,
          taskArgs.refundreceiver,
          taskArgs.signatures,
          { gasLimit: 2000000 }
        );
      } catch (error) {
        console.error(`gsp.executeTransaction() PRE-EXECUTION error\n`, error);
        process.exit(1);
      }
      if (taskArgs.log)
        console.log(`\n txHash execTransaction: ${executeTx.hash}\n`);

      let executeTxReceipt;
      try {
        executeTxReceipt = await executeTx.wait();
      } catch (error) {
        console.error(`gsp.executeTransaction() EXECUTION error\n`, error);
        process.exit(1);
      }

      if (taskArgs.log) {
        const eventNames = ["ExecutionSuccess", "ExecutionFailure"];

        const executionEvents = [];

        for (const eventname of eventNames) {
          const executionEvent = await run("event-getparsedlog", {
            contractname: "IGnosisSafe",
            contractaddress: taskArgs.gnosissafeproxyaddress,
            eventname,
            txhash: executeTxReceipt.transactionHash,
            blockhash: executeTxReceipt.blockHash,
            values: true,
            stringify: true,
          });
          if (executionEvent)
            executionEvents.push({ [eventname]: executionEvent });
        }
        console.log(
          `\nExecution Events emitted for execute-tx: ${executeTx.hash}:`
        );
        for (const event of executionEvents) console.log(event);
      }

      return executeTxReceipt.hash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
