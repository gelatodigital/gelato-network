const commandLine = require("../helpers/execShellCommand.js");
process.env.TEST="1"
process.env.CLAIM_STATE_ID="1"
process.env.EXECUTION_CLAIM="1"
process.env.DEFAULT_ACCOUNT="0x627306090abab3a6e1400e9345bc60c78a8bef57"
process.env.SELLER="0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"
process.env.SELL_AMOUNT="20"
process.env.SELL_TOKEN="WETH"
process.env.BUY_TOKEN="RDN"
process.env.BUY_AMOUNT="4000"
process.env.SKIP_TIME=6

describe("Test possible intregration test architecture", () => {
    it("test0 - Move migration files in", async function () {
        this.timeout(50000)
        await commandLine.execShellCommand(`mv ./2_DEV_migrate_dependencies.js ./migrations/2_DEV_migrate_dependencies.js; mv ./3_deploy_gelato.js ./migrations/3_deploy_gelato.js; mv ./4_deploy_dxGetter.js ./migrations/4_deploy_dxGetter.js`)
        console.log("#########################################")
    })
    it("test1 - Yarn Setup", async function () {
        this.timeout(50000)
        await commandLine.execShellCommand(`yarn setup`)
        console.log("#########################################")
    })
    it("test2 - Yarn Close1", async function () {
        this.timeout(50000)
        await commandLine.execShellCommand(`yarn close1`)
        console.log("#########################################")
    })
    it("test3  - Yarn Endow1", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`yarn endow1`)
        console.log("#########################################")
    })
    it("test4 - Move migration files out", async function () {
        this.timeout(50000)
        await commandLine.execShellCommand(`mv ./migrations/2_DEV_migrate_dependencies.js ./2_DEV_migrate_dependencies.js; mv ./migrations/3_deploy_gelato.js ./3_deploy_gelato.js; mv ./migrations/4_deploy_dxGetter.js ./4_deploy_dxGetter.js`)
        console.log("#########################################")
    })
    it("test5 - Mint execution claims", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test ./test/splitSellOrderTest.js`)
        console.log("#########################################")
    })
    it("test6 - Execute Execution Claim", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test ./test/executeTest.js`)
        console.log("#########################################")
    })

})

execShellCommand