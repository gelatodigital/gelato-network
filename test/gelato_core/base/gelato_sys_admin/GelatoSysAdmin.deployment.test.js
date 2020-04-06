// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need
import { expect } from "chai";

// Optional dependencies
import { constants, utils } from "ethers";

// Some constants at deployment time
const GELATO_GAS_PRICE_ORACLE = constants.AddressZero;
const GELATO_MAX_GAS = 7000000;
const INTERNAL_GAS_REQUIREMENT = 500000;
const MIN_PROVIDER_STAKE = utils.parseEther("0.1");
const MIN_EXECUTOR_STAKE = utils.parseEther("0.02");
const EXEC_CLAIM_TENANCY = 30 * 24 * 60 * 60; // 30 days
const EXEC_CLAIM_RENT = utils.parseUnits("1", "finney");
const EXECUTOR_SUCCESS_SHARE = 50;
const SYS_ADMIN_SUCCESS_SHARE = 20;
const SYS_ADMIN_FUNDS = 0;

describe("GelatoCore - GelatoSysAdmin - Deployment", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let owner;

  before(async function () {
    // Get the ContractFactory and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    [owner] = await ethers.getSigners();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("Should initialize only the creation time state variables", async function () {
    expect(await gelatoCore.owner()).to.equal(await owner.getAddress());
    expect(await gelatoCore.gelatoGasPriceOracle()).to.equal(
      GELATO_GAS_PRICE_ORACLE
    );
    expect(await gelatoCore.gelatoMaxGas()).to.equal(GELATO_MAX_GAS);
    expect(await gelatoCore.internalGasRequirement()).to.equal(
      INTERNAL_GAS_REQUIREMENT
    );
    expect(await gelatoCore.minProviderStake()).to.equal(MIN_PROVIDER_STAKE);
    expect(await gelatoCore.minExecutorStake()).to.equal(MIN_EXECUTOR_STAKE);
    expect(await gelatoCore.execClaimTenancy()).to.equal(EXEC_CLAIM_TENANCY);
    expect(await gelatoCore.execClaimRent()).to.equal(EXEC_CLAIM_RENT);
    expect(await gelatoCore.executorSuccessShare()).to.equal(
      EXECUTOR_SUCCESS_SHARE
    );
    expect(await gelatoCore.sysAdminSuccessShare()).to.equal(
      SYS_ADMIN_SUCCESS_SHARE
    );
    expect(await gelatoCore.sysAdminFunds()).to.equal(SYS_ADMIN_FUNDS);
  });
});
