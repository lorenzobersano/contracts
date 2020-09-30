const { abis } = require('./abis');
const { addresses } = require('./addresses');

export const passThroughWalletContract = (web3) =>
  new web3.eth.Contract(abis.passThroughWallet, addresses.passThroughWallet);
