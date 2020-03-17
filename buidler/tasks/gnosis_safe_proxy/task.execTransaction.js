import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
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
  .addOptionalParam("functionname", "The function we want to call")
  .addOptionalVariadicPositionalParam(
    "inputs",
    "The parameters for the function call"
  )
  .addOptionalParam(
    "to",
    "The address which to call/delegatecall. Defaults to <gnosissafeproxyaddress>"
  )
  .addOptionalParam(
    "value",
    "The value to sent along with the tx",
    0,
    types.int
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
    0,
    types.int
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
    0,
    types.int
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
  .setAction(async taskArgs => {
    try {
      if (!taskArgs.to && !taskArgs.contractname)
        taskArgs.to = taskArgs.gnosissafeproxyaddress;
      else if (!taskArgs.to && taskArgs.contractname) {
        const scriptContract = await run("instantiateContract", {
          contractname: taskArgs.contractname,
          read: true
        });
        taskArgs.to = scriptContract.address;
      }

      let data;
      if (taskArgs.functionname) {
        data = await run("abi-encode-withselector", {
          contractname: taskArgs.contractname,
          functionname: taskArgs.functionname,
          inputs: taskArgs.inputs
        });
      } else {
        data = await run(
          `gsp:scripts:defaultpayload:${taskArgs.contractname}`,
          {
            inputs: taskArgs.inputs
          }
        );
      }

      const signerAddr = await run("ethers", { signer: true, address: true });

      if (!taskArgs.signatures) {
        taskArgs.signatures = `0x000000000000000000000000${signerAddr.replace(
          "0x",
          ""
        )}000000000000000000000000000000000000000000000000000000000000000001`;
      }

      if (taskArgs.log) {
        console.log(
          `\n GnosisSafe.execTransaction:\
           \n To: ${taskArgs.contractname} at ${taskArgs.to}\
           \n Function: ${taskArgs.functionname}\
           \n Data:\n ${data}\
           \n Signatures:\n ${taskArgs.signatures}\n
          `
        );
      }

      /*
           ${taskArgs.value}\n
           ${taskArgs.operation}\n
           ${taskArgs.safetxgas}\n
           ${taskArgs.gasprice}\n
           ${taskArgs.gastoken}\n
           ${taskArgs.refundreceiver}\n
           ${taskArgs.gastoken}\n
      */

      const gnosisSafeProxy = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: taskArgs.gnosissafeproxyaddress,
        write: true
      });

      const executeTx = await gnosisSafeProxy.execTransaction(
        taskArgs.to,
        taskArgs.value,
        data,
        taskArgs.operation,
        taskArgs.safetxgas,
        taskArgs.basegas,
        taskArgs.gasprice,
        taskArgs.gastoken,
        taskArgs.refundreceiver,
        taskArgs.signatures,
        { gasLimit: 2000000 }
      );

      if (taskArgs.log)
        console.log(`\n txHash execTransaction: ${executeTx.hash}\n`);

      const executeTxReceipt = await executeTx.wait();

      if (taskArgs.log) {
        const executionSuccess = await run("event-getparsedlogs", {
          contractname: "IGnosisSafe",
          contractaddress: taskArgs.gnosissafeproxyaddress,
          eventname: "ExecutionSuccess",
          txhash: executeTx.hash,
          blockhash: executeTxReceipt.blockHash
        });
        if (executionSuccess) console.log(`\n ExecutionSuccess ✅`);

        const executionFailure = await run("event-getparsedlogs", {
          contractname: "IGnosisSafe",
          contractaddress: taskArgs.gnosissafeproxyaddress,
          eventname: "ExecutionFailure",
          txhash: executeTx.hash,
          blockhash: executeTxReceipt.blockHash
        });
        if (executionFailure) {
          console.log(`\n ExecutionFailure ❌`);
          console.log(executionFailure);
        }

        if (!executionSuccess && !executionFailure) {
          console.log(`
            \n🚫 Neither ExecutionSuccess or ExecutionFailure event logs where found\
            \n   executeTx: ${executeTxReceipt.hash}\n
          `);
        }
      }

      return executeTxReceipt.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
