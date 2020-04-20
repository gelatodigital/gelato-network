// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoExecutors creation time variable values
import initialState from "./GelatoExecutors.initialState";

describe("GelatoCore - GelatoExecutors - Setters: FUNDS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;

  let executor;
  let provider;
  let otherProvider;
  let randomGuy;

  let providerAddress;
  let otherProviderAddress;
  let executorAddress;

  let minExecutorStake;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();

    await gelatoCore.deployed();

    [executor, provider, otherProvider, randomGuy] = await ethers.getSigners();

    executorAddress = await executor.getAddress();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();

    minExecutorStake = await gelatoCore.minExecutorStake();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // stakeExecutor
  describe("GelatoCore.GelatoExecutors.stakeExecutor", function () {
    // it("Should allow anyone to stakeExecutor with minExecutorStake", async function () {
    //   // stakeExecutor()
    //   await expect(gelatoCore.stakeExecutor({ value: minExecutorStake }))
    //     .to.emit(gelatoCore, "LogStakeExecutor")
    //     .withArgs(executorAddress, minExecutorStake);

    //   // executorStake
    //   expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
    //     69420
    //   );

    //   // stakeExecutor()
    //   await expect(
    //     gelatoCore
    //       .connect(randomGuy)
    //       .stakeExecutor({ value: minExecutorStake.add(69) })
    //   )
    //     .to.emit(gelatoCore, "LogStakeExecutor")
    //     .withArgs(await randomGuy.getAddress, minExecutorStake.add(69));

    //   // executorStake
    //   expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
    //     42069
    //   );
    // });

    // it("Should allow anyone to stakeExecutor to other Providers", async function () {
    //   await expect(
    //     gelatoCore.stakeExecutor(otherProviderAddress, { value: 69420 })
    //   )
    //     .to.emit(gelatoCore, "LogStakeExecutor")
    //     .withArgs(otherProviderAddress, 69420, 69420);
    //   expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
    //     69420
    //   );

    //   await expect(
    //     gelatoCore
    //       .connect(otherProvider)
    //       .stakeExecutor(executorAddress, { value: 42069 })
    //   )
    //     .to.emit(gelatoCore, "LogStakeExecutor")
    //     .withArgs(executorAddress, 42069, 42069);
    //   expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
    //     42069
    //   );
    // });

    // it("Should NOT allow stakeExecutor(value: 0)", async function () {
    //   await expect(
    //     gelatoCore.stakeExecutor(executorAddress, { value: "0" })
    //   ).to.be.revertedWith("GelatoExecutors.stakeExecutor: zero value");
    // });
  });

  /*   // unstakeExecutor
  describe("GelatoCore.GelatoExecutors.unstakeExecutor", function () {
    it("Should allow Providers to unprovide their funds", async function () {
      // stakeExecutor
      await expect(gelatoCore.stakeExecutor(executorAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogStakeExecutor")
        .withArgs(executorAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
        69420
      );

      // unstakeExecutor
      await expect(gelatoCore.unstakeExecutor(69420))
        .to.emit(gelatoCore, "LogUnstakeExecutor")
        .withArgs(executorAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(0);

      // otherProvider: stakeExecutor
      await expect(
        gelatoCore
          .connect(otherProvider)
          .stakeExecutor(otherProviderAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogStakeExecutor")
        .withArgs(otherProviderAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42069
      );

      // otherProvider: unstakeExecutor
      await expect(gelatoCore.connect(otherProvider).unstakeExecutor(69))
        .to.emit(gelatoCore, "LogUnstakeExecutor")
        .withArgs(otherProviderAddress, 69, 42000);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42000
      );
    });

    it("Should automatically unstakeExecutor(all) if surplus withdrawamount", async function () {
      // stakeExecutor
      await expect(gelatoCore.stakeExecutor(executorAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogStakeExecutor")
        .withArgs(executorAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
        69420
      );

      // unstakeExecutor
      await expect(gelatoCore.unstakeExecutor(999999999999))
        .to.emit(gelatoCore, "LogUnstakeExecutor")
        .withArgs(executorAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(0);
    });
  });

  // unstakeExecutor
  it("Should NOT allow Providers with an assigned Executor to unprovide their funds", async function () {
    // minProviderStake required for providerAssignsExecutor
    const providedFunds = utils.bigNumberify(42069);

    // isProviderMinStaked
    expect(await gelatoCore.isProviderMinStaked(executorAddress)).to.be.false;

    // stakeExecutor()
    await expect(
      gelatoCore.stakeExecutor(executorAddress, {
        value: minProviderStake,
      })
    )
      .to.emit(gelatoCore, "LogStakeExecutor")
      .withArgs(executorAddress, minProviderStake, minProviderStake);
    expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
      minProviderStake
    );

    // isProviderMinStaked
    expect(await gelatoCore.isProviderMinStaked(executorAddress)).to.be.true;

    // stakeExecutor() (needed for providerAssignsExecutor())
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: await gelatoCore.minExecutorStake() });
    expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
      await gelatoCore.minExecutorStake()
    );

    // providerAssignsExecutor (needs executoMinStake)
    await expect(gelatoCore.providerAssignsExecutor(executorAddress))
      .to.emit(gelatoCore, "LogProviderAssignsExecutor")
      .withArgs(
        executorAddress,
        initialState.executorByProvider,
        executorAddress
      );
    expect(await gelatoCore.executorByProvider(executorAddress)).to.be.equal(
      executorAddress
    );

    // unstakeExecutor
    await expect(gelatoCore.unstakeExecutor(1)).to.be.revertedWith(
      "GelatoExecutors.unstakeExecutor: Must un-assign executor first"
    );

    expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
      minProviderStake
    );
    expect(await gelatoCore.executorByProvider(executorAddress)).to.be.equal(
      executorAddress
    );
  });

  // unstakeExecutor
  it("Should allow minFunded Providers to unassign Executor and unstakeExecutor", async function () {
    // minProviderStake required for providerAssignsExecutor
    const providedFunds = utils.bigNumberify(42069);

    // isProviderMinStaked
    expect(await gelatoCore.isProviderMinStaked(executorAddress)).to.be.false;

    // stakeExecutor()
    await expect(
      gelatoCore.stakeExecutor(executorAddress, {
        value: minProviderStake,
      })
    )
      .to.emit(gelatoCore, "LogStakeExecutor")
      .withArgs(executorAddress, minProviderStake, minProviderStake);

    // providerFunds
    expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(
      minProviderStake
    );

    // isProviderMinStaked
    expect(await gelatoCore.isProviderMinStaked(executorAddress)).to.be.true;

    // stakeExecutor() (needed for providerAssignsExecutor())
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: await gelatoCore.minExecutorStake() });

    // executorStake
    expect(await gelatoCore.executorStake(executorAddress)).to.be.equal(
      await gelatoCore.minExecutorStake()
    );

    // providerAssignsExecutor (needs executoMinStake)
    await expect(gelatoCore.providerAssignsExecutor(executorAddress))
      .to.emit(gelatoCore, "LogProviderAssignsExecutor")
      .withArgs(
        executorAddress,
        initialState.executorByProvider,
        executorAddress
      );

    // executorByProvider
    expect(await gelatoCore.executorByProvider(executorAddress)).to.be.equal(
      executorAddress
    );

    // unstakeExecutor() revert
    await expect(gelatoCore.unstakeExecutor(1)).to.be.revertedWith(
      "GelatoExecutors.unstakeExecutor: Must un-assign executor first"
    );

    // provider unassigns Executor
    await expect(gelatoCore.providerAssignsExecutor(constants.AddressZero))
      .to.emit(gelatoCore, "LogProviderAssignsExecutor")
      .withArgs(executorAddress, executorAddress, constants.AddressZero);

    // executorByProvider
    expect(await gelatoCore.executorByProvider(executorAddress)).to.be.equal(
      constants.AddressZero
    );

    // unstakeExecutor
    await expect(gelatoCore.unstakeExecutor(minProviderStake))
      .to.emit(gelatoCore, "LogUnstakeExecutor")
      .withArgs(executorAddress, minProviderStake, 0);
    expect(await gelatoCore.providerFunds(executorAddress)).to.be.equal(0);

    // isProviderMinStaked
    expect(await gelatoCore.isProviderMinStaked(executorAddress)).to.be.false;
  });
 */
});
