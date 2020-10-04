# Contracts

Intoo TV smart contracts.

To see how it works, head into the test directory. You will need Ganache running (or any other private network, with at least 3 accounts)

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

now you are ready to run the tests

```bash
yarn test
```

## Hooks

Pardon me for the name, I had good hook intentions initially.

Here you will find methods to

- pay into the PassThroughWallet (this will also increment user's EXP balance using a fixed exchange rate)
- getUserExpBalance
