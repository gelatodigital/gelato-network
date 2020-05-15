import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gelato-example-dapp",
  `Executes the example dapp of transfering 10 DAI from the users wallet to a destination wallet every 2 minutes for 5 times`
)
  .addParam(
    "sendtoken",
    "token which wll be sent from user EOA to destination address"
  )
  .addParam("destination", "address of account who should receive the tokens")
  .addParam(
    "amount",
    "how many tokens should be transferred from user account to destination address"
  )
  .addParam(
    "secondsdelta",
    "how many seconds should pass until gelato executes the transaction"
  )
  .addOptionalParam(
    "saltnonce",
    "how many seconds should pass until gelato executes the transaction",
    "42069",
    types.string
  )
  .addParam("cycles", "how many times the same task should be submitted")
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      const user = getUser();
      const userAddress = await user.getAddress();

      // Get / determine that address of the user's gelato user proxy smart contract
      // Get Gelato User Proxy Address
      const gelatoUserProxyAddress = await run(
        "gelato-predict-gelato-proxy-address",
        {
          useraddress: userAddress,
        }
      );

      // ##### Step #1: Create condition(s)
      // Get Address Or hardcode
      const conditionAddress = await run("bre-config", {
        deployments: true,
        contractname: "ConditionTimeStateful",
      });

      // Encode data of function gelato should call => Call Ok Function on ConditionTimeStateful.sol
      // This checks at what time the condition should return true
      // ConditionTimeStateful takes the proxies address as an argument to check if in its state there is
      // a timestamp that is should compare to the current time to determine if a task is executable or not
      const conditionData = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "ok",
        inputs: [gelatoUserProxyAddress],
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
        value: 0, // delegate calls always send 0 ETH
        termsOkCheck: true, // After the condition is checked, we will also conduct checks on the action contract
      });

      // ##### Action #2
      const actionData2 = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "setRefTime",
        inputs: [taskArgs.secondsdelta],
      });

      const action2 = new Action({
        addr: conditionAddress, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData2, // data is can be left as 0 for Task Specs
        value: 0, // this action sends 0 ETH
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

      // ##### Create Task Spec
      const task = new Task({
        conditions: [condition], // only need the condition inst address here
        actions: [action1, action2], // Actions will be executed from left to right after each other. If one fails, all fail
      });

      if (taskArgs.log) console.log(task);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        write: true,
        signer: user,
      });

      const expiryDate = 0; // 0 if the task should live forever

      // Check if proxy is already deployed. If not, we deploy and submit the task in one go
      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        write: true,
        signer: user,
      });

      let isDeployed = await gelatoUserProxyFactory.isGelatoProxyUser(
        userAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress, // Address of your provider account
        module: gelatoUserProxyProviderModule, // Module defining which proxies can submit tasks
      });

      let tx;
      if (isDeployed) {
        console.log(
          `\nProxy already deployed, executing action and submitting Task in one Tx\n`
        );
        // Instantiate the users gelato proxy contract
        const gelatoUserProxy = await run("instantiateContract", {
          contractname: "GelatoUserProxy",
          contractaddress: gelatoUserProxyAddress,
          write: true,
          signer: user,
        });

        tx = await gelatoUserProxy.execActionsAndSubmitTaskCycle(
          [action2], // Set the value in the condition before submitting the task
          gelatoProvider,
          [task], // submit the task to send tokens and update the condition value
          taskArgs.cycles, // Task should be submitted taskArgs.cycles times in total
          0 // Task should never expire
        );
      } else {
        console.log(
          `\nDeploying Proxy, executing action and submitting Task in one Tx\n`
        );
        tx = await gelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle(
          taskArgs.saltnonce, // Saltnonce to ensure we use the same proxy we approved tokens to
          [action2], // Set the value in the condition before submitting the task
          gelatoProvider, // Gelato Provider
          [task], // submit the task to send tokens and update the condition value
          0, // Task should never expire
          taskArgs.cycles, // Task should be submitted taskArgs.cycles times in total
          { gasLimit: 4000000 }
        );
      }

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined, Task submitted!`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
