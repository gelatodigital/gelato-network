const {execShellCommand, execShellCommandLog} = require("./helpers/execShellCommand.js");
process.env.TEST="1"
process.env.CLAIM_STATE_ID="1"
process.env.EXECUTION_CLAIM="1"

describe("Test possible intregration test architecture", () => {
    it("test0 - Move migration files in", async function () {
        this.timeout(30000)
        await execShellCommand.execShellCommand(`mv ./2_DEV_migrate_dependencies.js ./migrations/2_DEV_migrate_dependencies.js; mv ./3_deploy_gelato.js ./migrations/3_deploy_gelato.js; mv ./4_deploy_dxGetter.js ./migrations/4_deploy_dxGetter.js`)
        console.log("#########################################")
    })
    it("test1", async function () {
        this.timeout(30000)
        await execShellCommand.execShellCommand(`yarn setup`)
        console.log("#########################################")
    })
    it("test2", async function () {
        this.timeout(30000)
        await execShellCommand.execShellCommand(`yarn close1`)
        console.log("#########################################")
    })
    it("test3 - Move migration files out", async function () {
        this.timeout(30000)
        await execShellCommand.execShellCommand(`mv ./migrations/2_DEV_migrate_dependencies.js ./2_DEV_migrate_dependencies.js; mv ./migrations/3_deploy_gelato.js ./3_deploy_gelato.js; mv ./migrations/4_deploy_dxGetter.js ./4_deploy_dxGetter.js`)
        console.log("#########################################")
        process.env.TEST="2"
    })
    it("test4", async function () {
        this.timeout(30000)
        await execShellCommandLog.execShellCommand(`truffle test ./test/splitSellOrderTest.js`)
        console.log("#########################################")
        process.env.TEST="2"
    })
    it("test5", async function () {
        this.timeout(30000)
        await execShellCommandLog.execShellCommand(`truffle test ./test/executeTest.js`)
        console.log("#########################################")
    })
    it("test6 - Move migration files in", async function () {
        this.timeout(30000)
        await execShellCommand.execShellCommand(`mv ./2_DEV_migrate_dependencies.js ./migrations/2_DEV_migrate_dependencies.js; mv ./3_deploy_gelato.js ./migrations/3_deploy_gelato.js; mv ./4_deploy_dxGetter.js ./migrations/4_deploy_dxGetter.js`)
        console.log("#########################################")
    })

})

execShellCommand