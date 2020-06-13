import { task } from "@nomiclabs/buidler/config";

export default task(
  "gelato-dapp-example-two",
  `Executes the example dapp of swapping 1 DAI to WETH from the users walletevery 2 minutes for 5 times on Uniswap`
)
  .addParam(
    "selltoken",
    "token which wll be sent from user EOA to destination address"
  )
  .addParam("buytoken", "address of account who should receive the tokens")
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

      // @DEV You can find all contract addresses at ./buidler/config/networks/${network}/${network}.deployments.js
      // ##### Step #1: Create condition(s)
      // Get Address Or hardcode
      const conditionTimeStateful = await run("instantiateContract", {
        deployments: true,
        contractname: "ConditionTimeStateful",
        read: true,
      });

      // Encode data of function gelato should call => Call Ok Function on ConditionTimeStateful.sol
      // This checks at what time the condition should return true
      // ConditionTimeStateful takes the proxies address as an argument to check if in its state there is
      // a timestamp that is should compare to the current time to determine if a task is executable or not

      const conditionData = await conditionTimeStateful.getConditionData(
        gelatoUserProxyAddress
      );

      // Instantiate condition object
      const condition = new Condition({
        inst: conditionTimeStateful.address,
        data: conditionData,
      });

      // ##### Step #2: Create action(s)

      // ##### Action #1

      // @DEV Deploys a feeHandler Contract if you dont have one thus far
      // Check out "src/demo/provider_functions/task.getFeeHandler.js" for more details
      let feeHandlerAddress = await run("gelato-get-fee-handler", {
        fee: "0.5",
      });

      const feeHandler = await run("instantiateContract", {
        contractaddress: feeHandlerAddress,
        contractname: "ActionFeeHandler",
        read: true,
      });

      // In this case, the users EOA will pay for the fee
      const feeHandlerData = await feeHandler.getActionData(
        taskArgs.selltoken,
        taskArgs.amount,
        userAddress
      );

      // FeeHandler Action => Extracts a % fee from the users sellAmount
      const action1 = new Action({
        addr: feeHandlerAddress,
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        dataFlow: DataFlow.Out, // DataFlow.Out means that this action returns data that will be inputted into the next action,In this case the amount to be sold on uniswap - the provider fees
        termsOkCheck: true, // After the condition is checked, we will also conduct checks on the action contract
        value: 0, // Actions that use delegatecall always have value = 0
        data: feeHandlerData, //
      });

      // Get address from deployments.rinkeby file / or hardcode it
      const uniswapTrade = await run("instantiateContract", {
        deployments: true,
        contractname: "ActionUniswapTrade",
        read: true,
      });

      const uniswapTradeData = await uniswapTrade.getActionData(
        userAddress,
        taskArgs.selltoken,
        taskArgs.amount,
        taskArgs.buytoken,
        userAddress
      );

      // Create Action Object
      const action2 = new Action({
        addr: uniswapTrade.address,
        data: uniswapTradeData, // encoded data
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        value: 0, // delegatecalls always use 0 here BUT caution: delegatecalls can send ETH if the function that wraps them is payable.
        termsOkCheck: false, // If dataFlow == In, we dont need termsOkCheck
        dataFlow: DataFlow.In, // Data flow can be used to channel the return data from one action into another
      });

      // ##### Action #2
      // After action#1 is executes, we will execute another action, that updates the state on the condition, so that the timer to send the next transactions is reset
      const actionData3 = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "setRefTime",
        inputs: [taskArgs.secondsdelta, 0], // we pass 0, as we want the task, which will be minted after this action is executed, to be linked to the updated state
      });

      // As this data has Dataflow == DataFlow.In, we will override part of the encode data, namely the sellToken address and sellAmount, on-chain. You should still encode it here for this action though.

      const action3 = new Action({
        addr: conditionTimeStateful.address, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData3, // data of action to execute
        value: 0, // delegatecalls always use 0 here BUT caution: delegatecalls can send ETH if the function that wraps them is payable.
        operation: Operation.Call, // We are calling the contract instance directly, without script
        termsOkCheck: false, // conditionTimeStateful is not a gelato action, hence we put termsOkCheck to false
        dataFlow: DataFlow.none, // Data flow can be used to channel the return data from one action into another
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
        actions: [action1, action2, action3], // Actions will be executed from left to right after each other. If one fails, all fail
        selfProviderGasPriceCeil: 0, // Only relevant if the user is also the provider, which is not the case in this example
        selfProviderGasLimit: 0, // Only relevant if the user is also the provider, which is not the case in this example
      });

      if (taskArgs.log) console.log(task);

      // Check if proxy is already deployed. If not, we deploy and submit the task in one go
      const gelatoUserProxyFactory = await run("instantiateContract", {
        contractname: "GelatoUserProxyFactory",
        write: true,
        signer: user,
      });

      let isDeployed = await gelatoUserProxyFactory.isGelatoProxyUser(
        userAddress,
        gelatoUserProxyAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress, // Address of your provider account
        module: gelatoUserProxyProviderModule, // Module defining which proxies can submit tasks
      });

      const expiryDate = 0; // 0 if the task should live forever
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
          expiryDate,
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
          expiryDate,
          taskArgs.cycles, // Task should be submitted taskArgs.cycles times in total
          { gasLimit: 4000000 }
        );
      }

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(`Link to transaction: \n ${etherscanLink}\n`);
      await tx.wait();
      console.log(`✅ Tx mined, Task submitted!`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
