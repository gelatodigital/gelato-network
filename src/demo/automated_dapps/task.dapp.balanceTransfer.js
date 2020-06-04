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
        contractaddress: "0x1EC08134313c9e7E5EFcd7f2d7Fca2d21f40b8F4",
        write: true,
        signer: user,
      });

      const userProxies = await gelatoUserProxyFactory.gelatoProxiesByUser(
        userAddress
      );
      console.log(userProxies);

      const gelatoUserProxyAddress = userProxies[0];

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
      const conditionAddress = "0x8682B4A4e2eFcA124EEc646dd537EFDcE2F2C74C";

      // Encode data of function gelato should call => Call Ok Function on ConditionTimeStateful.sol
      // This checks at what time the condition should return true
      // ConditionTimeStateful takes the proxies address as an argument to check if in its state there is
      // a timestamp that is should compare to the current time to determine if a task is executable or not
      // address _userProxy, address _account, address _token, bool _greaterElseSmaller
      const conditionData = await run("abi-encode-withselector", {
        contractname: "ConditionBalanceStatefulMax",
        functionname: "ok",
        inputs: [gelatoUserProxyAddress, userAddress, taskArgs.sendtoken, true],
      });

      // Insantiate condition object
      const condition = new Condition({
        inst: conditionAddress,
        data: conditionData,
      });

      // ##### Step #2: Create action(s)
      // 1. Get address from deployments.rinkeby file / or hardcode it
      const actionAddress1 = "0xA8909da6986ebDbB4524f8942cB313c64eF5e185";

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
      });

      // ##### Action #2
      // address _account, address _token, bool _greaterElseSmaller, uint256 _delta
      console.log("1");
      const actionData2 = await run("abi-encode-withselector", {
        contractname: "ConditionBalanceStatefulMax",
        functionname: "setRefBalanceDelta",
        inputs: [userAddress, taskArgs.sendtoken, true, taskArgs.delta],
      });
      console.log("2");

      const action2 = new Action({
        addr: conditionAddress, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData2, // data of action to execute
        value: 0, // this action sends 0 ETH
        operation: Operation.Call, // We are calling the contract instance directly, without script
        termsOkCheck: false, // Always input false for actions we .call intp
      });

      // ##### Step #3: Instantiate provider module => In this case Gelato user Proxy
      const provider = getProvider();
      const providerAddress = await provider.getAddress();

      // Fetch the GelatoUserproxy Provider Module Address
      const gelatoUserProxyProviderModule =
        "0x544394229F2B98751fF56872D0294D7a816d60a9";

      // ##### Create Task
      const task = new Task({
        conditions: [condition], // only need the condition inst address here
        actions: [action1, action2], // Actions will be executed from left to right after each other. If one fails, all fail
      });

      if (taskArgs.log) console.log(task);

      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: "0xE7418743527a8e5F191bA4e9609b5914c9880a12",
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
