module.exports = async function(callback) {
  // Fetch Account & Contracts
  const accounts = await web3.eth.getAccounts();
  const account = accounts[0];
  const GelatoCore = artifacts.require("GelatoCoreDiffusion");
  const gelatoCore = await GelatoCore.at(
    "0x49A791153dbEe3fBc081Ce159d51C70A89323e73"
  );

  // Fetch minted and not burned executionClaims
  const mintedClaims = {};
  const deploymentblockNum = 6606049;

  
  // Get LogNewExecutionClaimMinted return values
  await gelatoCore
    .getPastEvents(
      "LogNewExecutionClaimMinted",
      {
        fromBlock: deploymentblockNum,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      events.forEach(event => {
        mintedClaims[parseInt(event.returnValues.executionClaimId)] = {
          selectedExecutor: event.returnValues.selectedExecutor,
          executionClaimId: event.returnValues.executionClaimId,
          userProxy: event.returnValues.userProxy,
          executePayload: event.returnValues.executePayload,
          executeGas: event.returnValues.executeGas,
          executionClaimExpiryDate: event.returnValues.executionClaimExpiryDate,
          executorFee: event.returnValues.executorFee
        };
        console.log(
          "LogNewExecutionClaimMinted Found:\n",
          "executionClaimId: ",
          returnValues.executionClaimId,
          "\n",
          mintedClaims[parseInt(event.returnValues.executionClaimId)]
        );
      });
    });

  // Get LogTriggerActionMinted return values
  await gelatoCore
    .getPastEvents(
      "LogTriggerActionMinted",
      {
        fromBlock: deploymentblockNum,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      events.forEach(event => {
        mintedClaims[parseInt(event.returnValues.executionClaimId)].trigger =
          event.returnValues.trigger;
        mintedClaims[
          parseInt(event.returnValues.executionClaimId)
        ].triggerPayload = event.returnValues.triggerPayload;
        mintedClaims[parseInt(event.returnValues.executionClaimId)].action =
          event.returnValues.action;
        console.log(
          "LogTriggerActionMinted Found:\n",
          "executionClaimId: ",
          returnValues.executionClaimId,
          "\n",
          mintedClaims[parseInt(event.returnValues.executionClaimId)]
        );
      });
    });

  // Check which execution claims already got executed and remove then from the list
  await gelatoCore
    .getPastEvents(
      "LogClaimExecutedBurnedAndDeleted",
      {
        fromBlock: deploymentblockNum,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      if (events !== undefined) {
        events.forEach(event => {
          delete mintedClaims[parseInt(event.returnValues.executionClaimId)];
          console.log(
            "LogClaimExecutedBurnedAndDeleted Found:\n",
            "executionClaimId: ",
            returnValues.executionClaimId,
            "\n"
          );
        });
      }
    });

  // Check which execution claims already got cancelled and remove then from the list
  await gelatoCore
    .getPastEvents(
      "LogExecutionClaimCancelled",
      {
        fromBlock: deploymentblockNum,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      if (events !== undefined) {
        events.forEach(event => {
          delete mintedClaims[parseInt(event.returnValues.executionClaimId)];
          console.log(
            "LogExecutionClaimCancelled Found:\n",
            "executionClaimId: ",
            returnValues.executionClaimId,
            "\n"
          );
        });
      }
    });

  console.log("Available ExecutionClaims: , mintedClaims", mintedClaims);

  // Loop through all execution claims and check if they are executable. If yes, execute, if not, skip
  let canExecuteReturn;

  for (let claim of mintedClaims) {
    console.log(`
        Check if ExeutionClaim: ${claim.executionClaimId} is executable
    `);
    // Call canExecute
    canExecuteReturn = await gelatoCore.contract.methods
      .canExecute(
        claim.trigger,
        claim.triggerPayload,
        claim.userProxy,
        claim.executePayload,
        claim.executeGas,
        claim.executionClaimId,
        claim.executionClaimExpiryDate,
        claim.executorFee
      )
      .call();

    if (parseInt(canExecuteReturn[6].toString()) === 6) {
      console.log(`
          🔥🔥🔥ExeutionClaim: ${claim.executionClaimId} is executable🔥🔥🔥
          `);
      console.log(`
          ⚡⚡⚡ Send TX ⚡⚡⚡
          `);

      let txGasPrice = await web3.utils.toWei("5", "gwei");
      let msgValue = await gelatoCore.contract.methods
        .getMintingDepositPayable(claim.action, claim.selectedExecutor)
        .call();
      gelatoCore.contract.methods
        .execute(
          claim.trigger,
          claim.triggerPayload,
          claim.userProxy,
          claim.executePayload,
          claim.executeGas,
          claim.executionClaimId,
          claim.executionClaimExpiryDate,
          claim.executorFee
        )
        .send({
          gas: 3000000,
          from: account,
          value: msgValue,
          gasPrice: txGasPrice
        })
        .once("receipt", receipt => console.log("Tx Receipt:", receipt));
      // .once("transactionHash", hash => (console.log(`
      // TX Hash:        ${hash}
      // EtherScan:      https://rinkeby.etherscan.io/tx/${hash}`)))
      // .once("receipt", receipt => (console.log('Tx Receipt:', receipt)))
      // .on("error", console.error);

      console.log(`
          ⚡⚡⚡ Tx Broadcasted ⚡⚡⚡
          `);
    } else {
      console.log(`
          ❌❌❌ExeutionClaim: ${claim.executionClaimId} is NOT executable❌❌❌`);
    }
  }

  console.log("___End of script___");
};
