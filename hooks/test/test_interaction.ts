import Web3 from "web3";
import {payEth} from "../interaction";
const HDWalletProvider = require("@truffle/hdwallet-provider");

const main = async () => {
  const provider = new HDWalletProvider(
    String(process.env.MNEMONIC),
    `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
  );

  const web3 = new Web3(provider);

  await payEth({ethAmount: 0.1, senderAddress: web3.defaultAccount!, web3});
};

main();
