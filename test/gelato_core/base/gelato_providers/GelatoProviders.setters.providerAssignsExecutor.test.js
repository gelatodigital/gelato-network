// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: EXECUTOR", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let provider;
  let providerAddress;
  let otherProvider;
  let otherProviderAddress;
  let executor;
  let executorAddress;
  let otherExecutor;
  let otherExecutorAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [
      provider,
      otherProvider,
      executor,
      otherExecutor,
    ] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();
    executorAddress = await executor.getAddress();
    otherExecutorAddress = await otherExecutor.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // providerAssignsExecutor
  describe("GelatoCore.GelatoProviders.providerAssignsExecutor", function () {
    it("Should allow minStaked Providers to assign a minStaked Executor", async function () {
      // provideFunds(minProviderFunds)
      const minProviderFunds = await gelatoCore.minProviderFunds();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderFunds,
      });

      // minExecutorStake needed for providerAssignsExecutor()
      const minExecutorStake = await gelatoCore.minExecutorStake();

      // isExecutorMinStaked
      expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.false;

      // stakeExecutor()
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

      // isExecutorMinStaked
      expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.true;

      // isExecutorAssigned
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );

      // executorProvidersCount(prevExecutor)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(newExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);

      // isExecutorAssigned
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;
    });

    it("Should allow minStaked Providers to reassign to other minStakedExecutor", async function () {
      // provideFunds(minProviderFunds)
      const minProviderFunds = await gelatoCore.minProviderFunds();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderFunds,
      });

      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await gelatoCore.providerAssignsExecutor(executorAddress);

      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(executor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;

      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // stakeExecutor: otherExecutor
      await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });

      // isExecutorAssigned: otherExecutor
      expect(await gelatoCore.isExecutorAssigned(otherExecutorAddress)).to.be
        .false;

      // providerAssignsExecutor: otherExecutor
      await expect(gelatoCore.providerAssignsExecutor(otherExecutorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(providerAddress, executorAddress, otherExecutorAddress);
      // executorProvidersCount(prevExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount - 1);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        otherExecutorAddress
      );
      // executorProvidersCount(newExecutor)
      expect(
        await gelatoCore.executorProvidersCount(otherExecutorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);

      // isExecutorAssigned: otherExecutor
      expect(await gelatoCore.isExecutorAssigned(otherExecutorAddress)).to.be
        .true;
    });

    it("Should NOT allow minStaked Providers to assign the same Executor again", async function () {
      // provideFunds(minProviderFunds)
      const minProviderFunds = await gelatoCore.minProviderFunds();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderFunds,
      });

      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        );
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );

      const executorProvidersCount = await gelatoCore.executorProvidersCount(
        executorAddress
      );

      // providerAssignsExecutor again
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: already assigned."
      );
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(sameExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(executorProvidersCount);

      // isExecutorAssigned: sameExecutor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;
    });

    it("Should NOT allow minFunded Providers to assign a not-minStaked Executor", async function () {
      // provideFunds(minProviderFunds)
      const minProviderFunds = await gelatoCore.minProviderFunds();
      await gelatoCore.provideFunds(providerAddress, {
        value: minProviderFunds,
      });

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.revertedWith(
        "GelatoProviders.providerAssignsExecutor: isExecutorMinStaked()"
      );
      // executorProvidersCount(prev)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        initialState.executorByProvider
      );
      // executorProvidersCount(new)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount);
    });

    it("Should NOT allow not-minFunded Providers to assign an Executor", async function () {
      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

      // isProviderMinFunded
      expect(await gelatoCore.isProviderMinFunded(providerAddress)).to.be.false;

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(
        gelatoCore.providerAssignsExecutor(executorAddress)
      ).to.be.revertedWith(
        "GelatoProviders.providerAssignsExecutor: isProviderMinFunded()"
      );

      // executorProvidersCount(prev)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);

      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        initialState.executorByProvider
      );

      // executorProvidersCount(new)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount);

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;
    });
  });
});
