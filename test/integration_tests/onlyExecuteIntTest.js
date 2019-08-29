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
        await commandLine.execShellCommand(`yarn mv-migrations-back`)
        console.log("#########################################")
    })
    it("Test Overview", async function () {
        console.log(`
            ***************************************************+

            TEST CASE

            SELLING:
             Total Sell Amount: 20 WETH
             Buy Token: ICE🍦
             Number of sell orders: 2
             Time between sell order: 6 hours

            SPECIAL ACTIONS?
             - none, withdrawals and depositAndSells fully automated

            ***************************************************+
            ***************************************************+

            LET'S GO 🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦
        `);
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
        await commandLine.execShellCommand(`yarn mv-migrations`)
        console.log("#########################################")
    })
    it("test5 - Setup gelatoCore & gelatoDutchExchange", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/setupTest.js`)
        console.log("#########################################")
    })
    it("test6 - Mint 4 Execution Claims", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/mintTest.js`)
        console.log("#########################################")
    })
    it("test7 - Execute 1st Execution Claim - execDepositAndSell", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/execTest.js`)
        console.log("#########################################")
    })
    it("test8 - Start Auction 3", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`yarn gdx-start-auction`)
        console.log("#########################################")
    })
    it("test9 - To the next execution Time", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`yarn gdx-to-next-exec-time`)
        console.log("#########################################")
    })
    it("test10 - Execute 2nd Execution Claim - execWithdraw", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/execTest.js`)
        console.log("#########################################")
    })
    it("test11 - Execute 3rd Execution Claim - execDepositAndSell", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/execTest.js`)
        console.log("#########################################")
    })
    it("test12 - Start Auction 4", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`yarn gdx-start-auction`)
        console.log("#########################################")
    })
    it("test13 - To the next execution Time", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`yarn gdx-to-next-exec-time`)
        console.log("#########################################")
    })
    it("test14 - Execute 4th Execution Claim - execWithdraw", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/execTest.js`)
        console.log("#########################################")
    })
    it("test15 - Resume", async function () {
        this.timeout(50000)
        await commandLine.execShellCommandLog(`truffle test test/resumeTest.js`)
        console.log("#########################################")
    })
})

execShellCommand