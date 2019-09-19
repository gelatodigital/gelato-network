module.exports = async function(callback) {
  // Get DutchX Instance
  const GelatoCore = artifacts.require("GelatoCore");
  const gelatoCore = await GelatoCore.at(
    "0x57A9cda1A88cbDa928f85e11Bf5E1E85fFDADe90"
  );

  await gelatoCore
    .getPastEvents(
      "LogNewExecutionClaimMinted",
      {
        fromBlock: parseInt(process.env.BLOCK),
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      events.forEach(event => {
        console.log(`
                Trigger address: ${event.returnValues.triggerAddress}
                Trigger payload: ${event.returnValues.triggerPayload}
                Action address: ${event.returnValues.actionAddress}
                Action payload: ${event.returnValues.actionPayload}
                Maxgas: ${event.returnValues.actionMaxGas}
                dappInterface: ${event.returnValues.dappInterface}
                Execution CLaim Id: ${event.returnValues.executionClaimId}
                Claim Hash: ${event.returnValues.executionClaimHash}
                Owner: ${event.returnValues.executionClaimOwner}
        `);
      });
    });
};
