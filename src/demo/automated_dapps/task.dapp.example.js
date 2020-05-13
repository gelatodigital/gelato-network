import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gelato-example-dapp",
  `Executes the example dapp of transfering 10 DAI from the users wallet to a destination wallet every 2 minutes for 5 times`
)
  .addFlag("log")
  .setAction(async ({ log }) => {
    try {
      const user = getUser();
      const userAddress = await user.getAddress();

      // ##### Step #1: Create condition(s)
      // Get Address Or hardcode
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTimeStateful",
      });

      // Encode data of function gelato should call => Call Ok Function on ConditionTimeStateful.sol
      // This checks at what time the condition should return true
      const conditionData = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "ok",
        inputs: [userAddress],
      });

      // Insantiate condition object
      const condition = new Condition({
        inst: conditionAddress,
        data: conditionData,
      });

      // ##### Step #2: Create action(s)
      // 1. Get address from deployments.rinkeby file / or hardcode it
      const actionAddress1 = await run("bre-config", {
        deployments: true,
        contractname: "ActionERC20TransferFrom",
      });

      // The ActionERC20TransferFrom contract's function "action" takes in a struct
      const inputObj = {
        user: userAddress,
        sendToken: taskArgs.sendtoken,
        destination: taskArgs.destination,
        sendAmount: taskArgs.amount,
      };

      // Encode action inputs
      const actionData1 = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [inputObj],
      });

      // Create Action Object
      const action1 = new Action({
        addr: actionAddress1,
        data: actionData1, // data is can be left as 0 for Task Specs
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        termsOkCheck: true, // After the condition is checked, we will also conduct checks on the action contract
      });

      // ##### Action #2
      const actionData2 = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "setRefTime",
        inputs: [taskArgs.timedelta],
      });

      const action2 = new Action({
        addr: conditionAddress, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData2, // data is can be left as 0 for Task Specs
        operation: Operation.Call, // We are calling the contract instance directly, without script
        termsOkCheck: false, // Always input false for actions we .call intp
      });

      // ##### Step #3: Instantiate provider module => In this case Gelato user Proxy
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Fetch the GelatoUserproxy Provider Module Address
      const gelatoUserProxyProviderModule = await run("bre-config", {
        deployments: true,
        contractname: "ProviderModuleGelatoUserProxy",
      });

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress, // Address of your provider account
        module: gelatoUserProxyProviderModule, // Module defining which proxies can submit tasks
      });

      // ##### Create Task Spec
      const task = new Task({
        provider: gelatoProvider,
        conditions: [condition.inst], // only need the condition inst address here
        actions: [action1, action2], // Actions will be executed from left to right after each other. If one fails, all fail
      });

      if (log) console.log(task);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        signer: user,
      });

      const expiryDate = 0; // 0 if the task should live forever
      const rounds = 0; // 0 to re-submit same task for ever. 1 for only once. 5 for 5 times.
      const tx = await gelatoCore.submitTask(task, expiryDate, rounds);

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined`);

      return taskSpec;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
