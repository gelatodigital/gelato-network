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
    it("Should Providers to assign a minStaked Executor", async function () {
      // minExecutorStake needed for providerAssignsExecutor()
      const minExecutorStake = await gelatoCore.minExecutorStake();

      // isExecutorMinStaked
      expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.false;

      // stakeExecutor()
      let tx = await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // isExecutorMinStaked
      expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.true;

      // isExecutorAssigned
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignedExecutor")
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

    it("Should allow Providers to reassign to other minStakedExecutor", async function () {
      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      let tx = await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      tx = await gelatoCore.providerAssignsExecutor(executorAddress);
      await tx.wait();

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
      tx = await gelatoCore
        .connect(otherExecutor)
        .stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // isExecutorAssigned: otherExecutor
      expect(await gelatoCore.isExecutorAssigned(otherExecutorAddress)).to.be
        .false;

      // providerAssignsExecutor: otherExecutor
      await expect(gelatoCore.providerAssignsExecutor(otherExecutorAddress))
        .to.emit(gelatoCore, "LogProviderAssignedExecutor")
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

    it("Should NOT allow Providers to assign the same Executor again", async function () {
      // stakeExecutor() (needed for providerAssignsExecutor())
      const minExecutorStake = await gelatoCore.minExecutorStake();
      let tx = await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });
      await tx.wait();

      // isExecutorAssigned: executor
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // providerAssignsExecutor
      await expect(gelatoCore.providerAssignsExecutor(executorAddress))
        .to.emit(gelatoCore, "LogProviderAssignedExecutor")
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

    it("Should NOT allow Providers to assign a not-minStaked Executor", async function () {
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
  });
});
