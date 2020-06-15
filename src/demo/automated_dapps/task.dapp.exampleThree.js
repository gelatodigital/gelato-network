import { task } from "@nomiclabs/buidler/config";

// This example illustrates, how to swap tokens on uniswap every X minutes, without the user requiring a provider to deposit ETH on gelato on its behalf

export default task(
  "gelato-dapp-example-three",
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

      const gelatoUserProxy = await run("instantiateContract", {
        contractaddress: gelatoUserProxyAddress,
        contractname: "GelatoUserProxy",
        write: true,
        signer: user,
      });

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
      const action1 = new Action({
        addr: uniswapTrade.address,
        data: uniswapTradeData, // encoded data
        operation: Operation.Delegatecall, // We are using an action Script here, see smart contract: ActionERC20TransferFrom.sol
        value: 0, // delegatecalls always use 0 here BUT caution: delegatecalls can send ETH if the function that wraps them is payable.
        termsOkCheck: true, // If dataFlow == In, we dont need termsOkCheck
        dataFlow: DataFlow.None, // Data flow = None
      });

      // ##### Action #2
      // After action#1 is executes, we will execute another action, that updates the state on the condition, so that the timer to send the next transactions is reset
      const actionData2 = await run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "setRefTime",
        inputs: [taskArgs.secondsdelta, 0], // we pass 0, as we want the task, which will be minted after this action is executed, to be linked to the updated state
      });

      // As this data has Dataflow == DataFlow.In, we will override part of the encode data, namely the sellToken address and sellAmount, on-chain. You should still encode it here for this action though.

      const action2 = new Action({
        addr: conditionTimeStateful.address, // We use the condition as an action (to dynamically set the timestamp when the users proxy contract can execute the actions next time)
        data: actionData2, // data of action to execute
        value: 0, // delegatecalls always use 0 here BUT caution: delegatecalls can send ETH if the function that wraps them is payable.
        operation: Operation.Call, // We are calling the contract instance directly, without script
        termsOkCheck: false, // conditionTimeStateful is not a gelato action, hence we put termsOkCheck to false
        dataFlow: DataFlow.none, // Data flow can be used to channel the return data from one action into another
      });

      // Fetch the GelatoUserproxy Provider Module Address
      const gelatoUserProxyProviderModule = await run("bre-config", {
        deployments: true,
        contractname: "ProviderModuleGelatoUserProxy",
      });

      // Check if user has provider module whitelisted
      const gelatoCore = await run("instantiateContract", {
        deployments: true,
        contractname: "GelatoCore",
        write: true,
        signer: user,
      });
      const isModuleProvided = await gelatoCore.isModuleProvided(
        gelatoUserProxyAddress,
        gelatoUserProxyProviderModule
      );
      console.log(isModuleProvided);
      if (!isModuleProvided) {
        console.log(`
        \nProvider Module not whitelisted
        \nWhitelisting Provider Module: ${gelatoUserProxyProviderModule}
        \n...
      `);
        const whitelistModuleData = await run("abi-encode-withselector", {
          contractname: "GelatoCore",
          functionname: "addProviderModules",
          inputs: [[gelatoUserProxyProviderModule]],
        });

        const whitelistModuledAction = new Action({
          addr: gelatoCore.address,
          data: whitelistModuleData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
          dataFlow: DataFlow.None,
        });

        await gelatoUserProxy.execAction(whitelistModuledAction, {
          gasLimit: 100000,
        });
      }

      const userBalanceOnGelato = await gelatoCore.providerFunds(
        gelatoUserProxyAddress
      );

      const currentGelatoGasPrice = await run("fetchGelatoGasPrice");

      const estimatedGasConsumption = ethers.utils.bigNumberify("500000");

      const requiredBalance = currentGelatoGasPrice.mul(
        estimatedGasConsumption
      );

      if (requiredBalance.gte(userBalanceOnGelato)) {
        console.log(
          `Topping up user balance on gelato by: ${ethers.utils.formatUnits(
            requiredBalance.toString(),
            "18"
          )} ETH`
        );

        const provideFundsData = await run("abi-encode-withselector", {
          contractname: "GelatoCore",
          functionname: "provideFunds",
          inputs: [gelatoUserProxyAddress],
        });

        const provideFundsAction = new Action({
          addr: gelatoCore.address,
          data: provideFundsData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: requiredBalance,
          dataFlow: DataFlow.None,
        });

        await gelatoUserProxy.execAction(provideFundsAction, {
          gasLimit: 100000,
          value: requiredBalance,
        });
      }

      let executorAddress = await gelatoCore.executorByProvider(
        gelatoUserProxyAddress
      );

      if (executorAddress === constants.AddressZero) {
        executorAddress = await run("bre-config", {
          addressbook: true,
          addressbookcategory: "gelatoExecutor",
          addressbookentry: "default",
        });
        console.log(
          `
        \nNo Executor selected yet
        \nSelecting standard gelato executor: ${executorAddress}
        \n...
      `
        );

        const assignExecutorData = await run("abi-encode-withselector", {
          contractname: "GelatoCore",
          functionname: "providerAssignsExecutor",
          inputs: [executorAddress],
        });

        const assignExecutorAction = new Action({
          addr: gelatoCore.address,
          data: assignExecutorData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
          dataFlow: DataFlow.None,
        });

        await gelatoUserProxy.execAction(assignExecutorAction, {
          gasLimit: 100000,
          value: requiredBalance,
        });
      }

      // ##### Create Task Spec
      const task = new Task({
        conditions: [condition], // only need the condition inst address here
        actions: [action1, action2], // Actions will be executed from left to right after each other. If one fails, all fail
        selfProviderGasPriceCeil: 0, // Only relevant if the user is also the provider, which is not the case in this example
        selfProviderGasLimit: estimatedGasConsumption, // Gas Limit executor should use when submitting the transaction
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
        addr: gelatoUserProxyAddress, // Address of your provider account
        module: gelatoUserProxyProviderModule, // Module defining which proxies can submit tasks
      });

      const expiryDate = 0; // 0 if the task should live forever
      let tx;
      if (isDeployed) {
        console.log(
          `\nProxy already deployed, executing action and submitting Task in one Tx\n`
        );

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
