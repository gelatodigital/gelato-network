<p  align="center"><img  src="https://i.imgur.com/ZvVG2b1.png"  width="250px"/></p>

<h1  align="center">Gelato - The easiest way to build automated ethereum dapps</h1>

<p  align="center">

<a  href="https://circleci.com/gh/gelatodigital/gelato-V1"  alt="circleCI">

<img  src="https://circleci.com/gh/gelatodigital/gelato-V1.svg?style=shield&circle-token=d72f3799a6ac81e89e2e0f9a29f7633baef8252b">

</a>

<a  href="https://coveralls.io/github/gelatodigital/gelato-V1"  alt="coverals">

<img  src="https://coveralls.io/repos/github/gelatodigital/gelato-V1/badge.svg?t=esHbYY">

</a>

<a  href="https://codechecks.io"  alt="codeChecks">

<img  src="https://raw.githubusercontent.com/codechecks/docs/master/images/badges/badge-default.svg?sanitize=true">

</a>

</p>

---

# Setup

```
git clone https://github.com/gelatodigital/gelato-V1.git

cd gelato-V1

yarn install

npx buidler compile
```

Create a .env file and store the following 5 environment variables.
Use your own private keys for USER_PK and PROVIDER_PK and your own Infura project id, the below are just example placeholder values).
DEV_MNEMONIC and MAINNET_MNEMONIC must be provided in .env but you can use the "test test .." placeholders from the example below:

```
USER_PK="040494B9430949583848949031094390493983E8943D983948934898A898C892"
PROVIDER_PK="743878AB348983298EB238938293892C983984989FD834894898989A89382392"
INFURA_ID="a489898712dd89312393898cf9032398"
DEV_MNEMONIC="test test test test test test test test test test test test test test test test"
MAINNET_MNEMONIC="test test test test test test test test test test test test test test test test"
```

**Make sure to add .env to .gitignore!**

# Documentation🍦

## What is Gelato ?

Gelato is a tool that enables web3 developers to build automated dapps on Ethereum. Think of Gelato as enabling you to use `If This, Then That` for smart contracts. It allows for the combination of arbitrary conditions with arbitrary actions on-chain, which will be executed on behalf of your Users by a network of relay nodes.

## Who is Gelato for?

Developers, who want to build automated dapps, without having to worry about running the required underlying relay node infrastructure.

## What is an automated dapp?

**Example #1:** Swap 100 DAI to ETH on Uniswap every week.

**Example #2:** Automatically refinance my loan between multiple lending protocols to always get the highest yield.

A **regular dapp** like uniswap.exchange requires Users to interact with it manually by sending transactions every time they want to swap tokens. Users that want to sell 100 DAI every week on uniswap have to manually do it every week.

An **automated dapp** requires Users to only send a transaction once and then will keep on sending the ensuing transactions on the Users' behalves in the future, when, and only if, the User-defined conditions are met. That's why, with Gelato integrated in the dapp, Users that want to sell 100 DAI every week on uniswap only have to send one initialization transaction for their 100 DAI to be automatically sold every week from then onward.

## How Gelato works:

At its core, Gelato gives dapp developers **(Providers)** access to a network of relay nodes **(executors),** which execute certain transactions **(actions)** on behalf of their **users**, if certain predefined **conditions** are met.

Everyone can access the Executors' services by submitting arbitrary Tasks to them, which they will execute exactly as per the developer's specification. Executors never have custody of Users funds, they simply initiate the transaction. Funds are always kept either in the User's wallet or in their personal smart contract wallet (proxy contract).

Each dapp User must have a personal smart contract wallet (proxy contract) deployed through which they interact with the Gelato protocol, in order for the dapp to be able to leverage Gelato automation for them. Once this requirement and a few more case-by-case details are fulfilled, dapps can let their Users submit Tasks to gelato, which will execute the requested transactions in the future.

The only thing Executors demand before executing a transaction is to be rewarded, or at least compensated, for their execution cost. This is accomplished by so called "Providers" depositing ETH on gelato. Gelato will calculate how much gas was consumed and what the current gas price is and will pay the Executor for its accomplished work using the formula: **consumed gas \* current gas price \* exectutorRewardFactor**. If the execution transaction somehow failed, Providers are only liable to pay the Executors a refund for the gas costs, without a reward. We expect that the role of Providers will in most cases be taken by dapp developers, in order to exert control over the User experience of their Users.

And why should end-users not prepay for future transaction executions themselves, you might ask? While this is certainly possible with Gelato , having to ask end-users to deposit some ETH on Gelato before their transactions get executed still sounded like bad UX to us. Especially because end-users would have to make accurate predictions about future gas prices, in order to have some degree of certainty that they will still have enough funds deposited on gelato, in order to pay Executors when the time has come. That's why we introduced the concept of **Providers**, who should abstract this complexity for the end-users.

Gelato works together with Chainlink to provide its integration Users - notably Providers - with constantly updated, fair gas prices. That way Gelato Users can be sure that Executors are not charging unfair gas prices.

## Providers:

Providers deposit ETH on gelato, in order to pay for their Users' automated transactions. In most cases, Providers are dapp developers that want to offer cool automated dapps to their customers, without requiring them to prepay ETH.

Providers have the ability to define exactly what kind of automation **tasks** they provide to Users, so that Providers control the business logic of the Tasks they pay for. They can define:

1. The Spec of the Task, or in other words, what kind of conditions are allowed in combination with what kind of actions

2. The maximum execution gas price for any Task Spec they whitelist.

3. They can define much more on their "ProviderModule". Notably, what type of Users, or rather User smart contract proxy accounts, they allow to tap into the Provider funds, to pay for transaction automation.

#### Why would a Provider pay for their Users transaction fees on gelato?

In short Providers are incentivised to pay for their Users automated transactions because they can provide great UX this way and they have many opportunites to create interesting business models on top of gelato. For example, if a Provider enables Users to swap DAI to ETH on uniswap every 2 days, then a fee could be applied for each executed transaction that retains 0.5% of the sold tokens and sends them to the Provider.

This way, Users do not have to prepay ETH on Gelato and Providers get compensated / rewarded for paying the transaction fees on behalf of Users, all without having to do the heavy lifting of running the underlying infrastructure.

Hence you can think of Gelato as a pay-as-you-go execution service for developers to create the first wave of User-friendly automated dapps, while also running a business model.

# Getting started as a Provider

Check if the account linked to your `PROVIDER_PK` has sufficient ETH for the network you want to test on.
You can get Rinkeby ETH [here](https://faucet.rinkeby.io/).

## How to become a Gelato Provider

In order to use gelato, a Provider has to do the following steps. **Note:** Gelato is only on rinkeby as of now.

#### 1. Add some balance (ETH) to gelato

To top up your Gelato balance by 1 ETH (we recommend not less, as gas prices are quite high atm (14.05.20), run:

    npx buidler gelato-providefunds 1 --network rinkeby

If you would like to withdraw your funds later, simply run (not now)

    npx buidler gelato-unprovidefunds --network rinkeby

#### 2. Assign your Provider to the Gelato executor network

This enables an Executor to execute the transactions on behalf of your Users.

```
npx buidler gelato-assign-executor --network rinkeby
```

#### 3. Define who can submit Tasks, whose executions is to be paid for from your Provider funds, with a whitelist on your Gelato Provider module.

A User in the Gelato system is represented by a proxy contract. A proxy contract is a smart contract account which is linked to a User. The dapp Users' Tasks will all be executed through the Users' proxy contracts.

There are several proxy smart contracts out there developers are using. We built Gelato to be fully proxy agnostic, so you can use whatever proxy contract standard you prefer. Examples of proven proxy contracts include the Gnosis Safe or Maker's DSProxy. We also created a tailor made Gelato User Proxy, which boasts native functionalities unique to the Gelato protocol.

Let’s say you want your Users to only be allowed to submit Tasks with Gelato User Proxies. To enable these Users to use you as a Provider with a Gelato User Proxy, run:

    npx buidler gelato-add-provider-module --modulename GelatoUserProxy --network rinkeby

Now you enabled every User that has a GelatoUserProxy to be a potential customer of yours. When you start integrating Gelato in your UI, you can deploy a proxy for first time Users and have them start using your service, all in one transaction, using the Gelato UserProxyFactory.

#### 4. Define what kind of Tasks Users can submit with you as Provider (whitelist a Task Spec).

You can think of the Gelato executors as bots that accept Tasks from your Users and that execute them according to what the User specified. You as the Provider have the power to define in advance what type of conditions and what type of actions (together called a Task) the Users are allowed to ask Executors to execute on their behalf.

This is done to ensure that you can always integrate a sustainable business model within Tasks, that compensate you as the Provider for your incurred Task execution fees on gelato.

**Whitelisting the actual Task Spec:**

Before any User can submit a Task to gelato, with you as the Task Provider, fist you must have whitelisted (provided) the specification for the Task. To whitelist a so-called _TaskSpec_, you have to instantiate it in a `.js` file.

You can see an example of how this is done by checking out `./src/demo/task.spec.example.js`, which defines a _TaskSpec_ for a Task that lets Users transfer a selected Token from the User's wallet to a given destination address every X minutes, N times.

To checkout how a **TaskSpec** object looks like, run this command that returns the above mentioned example:

```
npx buidler gelato-return-taskspec-example --network rinkeby
```

To whitelist this example TaskSpec, thereby enabling Users to submit Tasks that conform to it, run:

```
npx buidler gelato-whitelist-taskspec example --network rinkeby
```

That’s it from a Provider's perspective in terms of what you minimally have to do, to enable Users to submit Tasks on Gelato with you being their Provider! 🍦

Now let's see how your User's can submit a Task that matches your TaskSpec

# Getting started as a User - How to submit a Task for execution to Gelato

**Note:** The example code discussed in this chapter is found here: `src/demo/automated_dapps/task.dapp.example.js`.
Similar code would normally be located in your UI, to provide access to your automated dapp features (which are your whitelisted Task Specs on gelato).

### Example: Automatically transfer 1 DAI every 2 minutes to a given destination address:

#### 1. Make sure you have completed the Setup and have a User account funded with ETH.

Check if the account linked to your `USER_PK` has sufficient ETH for the network you want to test on.
You can get some Rinkeby ETH [here](https://faucet.rinkeby.io/).

#### 2. Get some rinkeby DAI.

You can get some from [Compound's Rinkeby UI](https://app.compound.finance/) by going on Supply DAI => Withdraw => Faucet

#### 3. Get the proxy address of your User proxy account.

Run:

```
npx buidler gelato-predict-gelato-proxy-address --network rinkeby
```

**=>** your proxy address e.g. 0x35dE7aCAd63E30B22C3305ac0e3fb8438697D0Fb

#### 4. Approve your proxy contract to transfer 5 DAI in total on your behalf (using rinkeby DAI address here)

```
npx buidler gelato-approve-erc20 0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea 5000000000000000000 $YOUR_PROXY_ADDRESS --network rinkeby
```

#### 5. Make sure you, as a Provider, have whitelisted the example TaskSpec. To check, run:

```
npx buidler gelato-check-if-provided --taskspecname example --network rinkeby
```

If it is not whitelisted by your Provider, run:

```
npx buidler gelato-whitelist-taskspec example --network rinkeby
```

#### 6. Run the following script to start the automatic process of transferring 1 DAI to a given destination address every 2 minutes (120 seconds), 5 times in a row (total of 5 DAI):

```
npx buidler gelato-example-dapp --sendtoken 0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea --destination 0x518eAa8f962246bCe2FA49329Fe998B66d67cbf8 --amount 1000000000000000000 --secondsdelta 120 --cycles 5 --network rinkeby
```

Once the transaction, which calls the `submitTaskCycle()` function on Gelato Core using your User's GelatoUserProxy contract, is mined, Gelato will monitor the specified condition, and when it is fulfilled, an Executor will execute the example Task on behalf of you, the User. The consumed gas amount \* current gas price \* executorRewardFactor will also be deduced from your Provider account balance.

Now watch your USER_PK account on [Etherscan](https://rinkeby.etherscan.io/) and observe that the tokens are being transferred out of your account every 2 minutes like magic ✨

5 Tasks means that 5 transactions will be executed in total. This is because we inputted `--cycles 5`. If we wanted this Task to be executed in infinite cycles, we would simply input `--cycles 0`, though make sure your Provider has sufficient balance before you do that. Remember Executor will only execute Users' Tasks, if the Provider has the balance to pay for it ;).

# Whitelist your own custom TaskSpec as a Provider

This is where it becomes interesting and you can become creative. With gelato, you can combine arbitrary conditions (e.g. if price of ETH/DAI on Uniswap) with arbitrary actions (e.g. sell DAI for ETH) and combine them in a new **TaskSpec**, which you simply have to whitelist once on gelato. After it is whitelisted, Users can submit the corresponding Tasks and can enjoy amazing automation features!

If this still feels to tricky for you, feel free to reach out to us, we're more than happy to help you out!

## Whitelist your own custom Task Spec:

#### 1. Create a file which returns your Task Spec

run:

```
touch ./src/demo/task_specs/task.spec.<nameOfYourTaskSpec>.js
```

and follow the example of `./src/demo/task.spec.example.js` to instantiate and return a TaskSpec object.

Make sure that you name the Task returning your TaskSpec correctly like: `"gelato-return-taskspec-example"`. An example would be `“gelato-return-taskspec-time-based-uniswap-trade`.

#### 2. Add the path to your TaskSpec to the Tasks Spec collection file

When you are done, add the path to your Task Spec file to `src/demo/task_specs/collection.tasks.specs.js`

#### 3. Whitelist your TaskSpec on gelato

To whitelist your _TaskSpec_ so that Users can submit corresponding _Tasks_, run:

```
npx buidler gelato-whitelist-taskspec time-based-uniswap-trade --network rinkeby
```

That's it, now Users can submit Tasks that follow your Task Spec guideline!

# Instruct Gelato to execute a Task based on your Providers custom TaskSpec as a User

Now that you whitelisted a TaskSpec on gelato, Users can submit Tasks with you being marked as the Provider who will pay for transaction fees. Let’s see how that would look like:

### Thing to keep in mind:

Before enabling Users to submit Tasks with you being listed as the Provider, you should make sure that:

a) The Task to be submitted is indeed whitelisted by the Provider (you). To check if you provided the example Task Script, run:

```
npx buidler gelato-check-if-provided --taskspecname <nameOfYourTaskSpec> --network rinkeby --log
```

b) Your Provider balance is sufficiently funded. To check that, run

```
npx buidler gelato-check-if-provider-liquid --network rinkeby
```

c) Your Users have sufficient ERC20 allowance if you plan on using the Users proxy contract as a “light-proxy”. Check out the commands in the example above, if you need a refresher.

**Note:** Users always have to submit Tasks through their proxy contracts and never through their EOAs, otherwise it won’t work.

To try out submitting a Task that follows the newly whitelisted TaskSpec, follow these steps:

#### 1. Create a file which will contain the code that instantiates and submits the Task

run:

```
touch ./src/demo/automated_dapps/task.<nameOfYourTask>.js
```

and follow the example of `src/demo/automated_dapps/task.dapp.example.js` to instantiate and return a TaskSpec object.

#### 2. Add the path to your script which submits the Task to the Dapp collection file

Path of collection file `src/demo/automated_dapps/collection.tasks.demo.dapps.js`

#### 3. Execute your new script to submit the Task with your Users proxy account

Instead of `...params` you probably need some params that define what the User inputs. Check out the example demo scipts above for inspiration.

```
npx buidler gelato-<nameofyourtask> ...params --network rinkeby
```

That's it!

## Further technical details:

#### What is a Task?

**A Task is an object which consists of several parts:**

#### Conditions (A list of several individual conditions, each consisting of)

- inst (address): The address of the condition that will be called. An example of this would be gelato’s time condition, which compares the current timestamp `block.timestamp` with another timestamp, which when being equal or greater indicating that the condition is fulfilled

* data (bytes): Encoded data of the function that will be called on the condition. Note: Every condition in Gelato must have a function called `ok`, which when fulfilled returns “OK”.

#### Actions (A list of several individual actions, each consisting of)

- addr (address): The address of the action you would like to call. This could be e.g. the address of uniswap or the address of a smart contract script that you want your Users proxy to delegate call into

* data (bytes): Encoded data of the function that will be called on the action contract.

- operation (uint256): If the proxy should .call (0) or .delegatecall (1) into the action. If you don't know the difference, read [this](https://ethereum.stackexchange.com/questions/3667/difference-between-call-callcode-and-delegatecall)

* value: (uint256): If ETH should be send to an action or not (only possible if .call is chosen in operation)

- termsOkCheck (bool): Used for Gelato actions that enable Providers to verify the inputted action payload. If marked as true, Gelato will call a special `termsOk` function on the respective action before execution, which needs to return `"OK"` in order for execution to proceed

---

#### Gelato Provider

**Gelato Tasks are linked to a Gelato Provider**

The Provider is also a JS object that is submitted alongside the Task:

- addr (address) => The address of the Provider who is paying for the transaction. This will be the address you used to deposit ETH on gelato.

* module (address) => The address of the Provider module which verifies the type of proxy contract allowed to access the Providers services. In our previous example, this would be the address returned by `gelato-add-provider-module`

---

#### What is a light-proxy?

A light-proxy never really holds the funds after a transaction is conducted, it only acts as an atomic transfer agent. For example, if your User submits a Task to swap 100 DAI to ETH on Uniswap every day, then up until the Task execution, all tokens will remain in your User's EOA and the proxy will simply only have an allowance (e.g. infinite allowance), to transfer the tokens out of your Users actual wallet. Now when the condition is met, the proxy will transfer the funds from the User's EOA to itself, then from there to Uniswap, and finally, when the swap is done, it will send the proceeds back to the User EOA- all atomically in a single Task execution transaction.

To enable the proxy to do so, it requires an approval by the account of the User that holds the funds (e.g. the Nano Ledger, Metamask or another wallet).

On the other hand, a heavy-proxy might keep custody of its User's funds before and after the Tasks are executed. In such a scenario, Users that want to swap 1000 DAI over the next 10 days every day, will transfer 1000 DAI to their proxy before Task submission, which will then execute swaps for them over the next 10 days. Heavy proxies control their users' funds and thus do not need an approval from them to spend them for each Task the users submit. This, arguably, can lead to a better UX because Users now do not have to send multiple ERC20 approval transactions, and can likely submit Tasks that are eligible for automated Execution in merely one transaction.

---

## Need help?

Let us know in our Telegram Chat if you have any issues, we are more than happy to help you get going and even provide you feedback on your idea for an automated dapp (we built quite a lot ourselves)!

Let’s build the next generation of etherem dapps, fully automated, together.

Reach out to us in our official [Telegram Community Chat](http://tiny.cc/gelatotelegtram)
