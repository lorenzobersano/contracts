# Contracts

Intoo TV smart contracts.

To see how it works, head into the test directory. You will need to launch Ganache-cli with these parameters

```
ganache-cli --defaultBalanceEther 10000 --network-id 1337 --chain-id 1337 --deterministic
```

You will also need a node version ^12. I use nvm to manage multiple node versions at the same time. This is akin to how pyenv is used to manage different versions of Python

Install yarn globally

```bash
npm install -g yarn
```

First install the deps

run in root

```bash
yarn
```

## Tests

To run the tests you'll need both the ethereum-bridge (`yarn add -g ethereum-bridge`) and the GSN cli (`yarn add -g @opengsn/gsn`)

Run them in two different terminals:
To start ethereum-bridge

```bash
ethereum-bridge -H localhost:8545 -a 9 --dev
```

To start GSN

```bash
gsn start
```

Once GSN starts, copy the Forwarder and Paymaster addresses printed by the terminals and put them in your `.env` file.

Now you are ready to run the tests

```bash
yarn test
```
