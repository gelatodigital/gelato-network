import { task } from "@nomiclabs/buidler/config";
import { constants, utils } from "ethers";

export default task(
  "gelato-example-balance-transfer",
  `Submits task which tracks the users balance and transfers tokens if the balance increased by the specified delta`
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
    "delta",
    "after what balance increase should the action be triggered?"
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

      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        deployment: true,
        write: true,
        signer: user,
      });

      const gelatoUserProxyAddress = await run(
        "gelato-predict-gelato-proxy-address",
        {
          useraddress: userAddress,
        }
      );
      // Get / determine that address of the user's gelato user proxy smart contract
      // Get Gelato User Proxy Address
      // const gelatoUserProxyAddress = await run(
      //   "gelato-predict-gelato-proxy-address",
      //   {
      //     useraddress: userAddress,
      //   }
      // );

      // ##### Step #1: Create condition(s)
      // Get Address Or hardcode
      const conditionBalanceStateful = await run("instantiateContract", {
        deployments: true,
        contractname: "ConditionBalanceStateful",
        write: true,
      });

      const conditionData = await conditionBalanceStateful.getConditionData(
        gelatoUserProxyAddress,
        userAddress,
        taskArgs.sendtoken,
        true
      );

      // Insantiate condition object
      const condition = new Condition({
        inst: conditionBalanceStateful.address,
        data: conditionData,
      });

      // ##### Step #2: Create action(s)
      // 1. Get address from deployments.rinkeby file / or hardcode it
      const actionAddress1 = await run("bre-config", {
        deployments: true,
        contractname: "ActionERC20TransferFrom",
      });

      // The ActionERC20TransferFrom contract's function "action" takes in a struct
      const transferFromInputs = [
        userAddress,
        taskArgs.sendtoken,
        taskArgs.destination,
        taskArgs.amount,
      ];

      // Encode action inputs
      const actionData1 = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: transferFromInputs,
      });

      // Create Action Object
      const action1 = new Action({
        addr: actionAddress1,
        data: actionData1, // data is can be left as 0 for Task Specs
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        value: 0, // delegate calls always send 0 ETH
        termsOkCheck: true, // After the condition is checked, we will also conduct checks on the action contract
        dataFlow: DataFlow.none,
      });

      // ##### Action #2
      // address _account, address _token, bool _greaterElseSmaller, uint256 _delta
      const actionData2 = await run("abi-encode-withselector", {
        contractname: "ConditionBalanceStateful",
        functionname: "setRefBalanceDelta",
        inputs: [userAddress, taskArgs.sendtoken, taskArgs.delta],
      });

      const action2 = new Action({
        addr: conditionBalanceStateful.address, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData2, // data of action to execute
        value: 0, // this action sends 0 ETH
        operation: Operation.Call, // We are calling the contract instance directly, without script
        termsOkCheck: false, // Always input false for actions we .call intp
        dataFlow: DataFlow.none,
      });

      // ##### Step #3: Instantiate provider module => In this case Gelato user Proxy
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Fetch the GelatoUserproxy Provider Module Address
      const gelatoUserProxyProviderModule = await run("bre-config", {
        deployments: true,
        contractname: "ProviderModuleGelatoUserProxy",
      });

      // ##### Create Task
      const task = new Task({
        conditions: [condition], // only need the condition inst address here
        actions: [action1, action2], // Actions will be executed from left to right after each other. If one fails, all fail
      });

      if (taskArgs.log) console.log(task);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        deployments: true,
        write: true,
        signer: user,
      });

      const expiryDate = 0; // 0 if the task should live forever

      // Check if proxy is already deployed. If not, we deploy and submit the task in one go

      let isDeployed = await gelatoUserProxyFactory.isGelatoProxyUser(
        userAddress,
        gelatoUserProxyAddress
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

        // ##### Let's check if the task spec is whitelisted!
        //  address _userProxy, Provider memory _provider, Task memory _task, uint256 _expiryDate
        const canSubmitResult = await gelatoCore.canSubmitTask(
          gelatoUserProxyAddress,
          gelatoProvider,
          task,
          expiryDate
        );

        if (canSubmitResult !== "OK")
          throw Error(`Cannot Submit Task - Reason: ${canSubmitResult}`);

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
          0, // Task should never expire
          taskArgs.cycles // Task should be submitted taskArgs.cycles times in total
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
          { gasLimit: 6000000 }
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
