import Web3 from "web3";
import {addresses} from "./addresses";

type payEthArgType = {
  ethAmount: number;
  senderAddress: string;
  web3: Web3;
};

export const payEth = async ({
  ethAmount,
  senderAddress,
  web3
}: payEthArgType) => {
  await web3.eth.sendTransaction({
    from: senderAddress,
    to: addresses.passThroughWallet,
    value: ethAmount
  });
};
