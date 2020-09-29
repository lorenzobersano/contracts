import Web3 from "web3";
import {Contract} from "web3-eth-contract";
import {abis} from "./abis";
import {addresses} from "./addresses";

export type passThroughWalletType = (web3: Web3) => Contract;

export const passThroughWalletContract: passThroughWalletType = (web3) =>
  new web3.eth.Contract(abis.passThroughWallet, addresses.passThroughWallet);
