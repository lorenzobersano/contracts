const Web3 = require("web3");
const {
  payEth,
  createTable,
  putUserExpBalance,
  getUserBalance
} = require("../index");

const payIntoWallet = async () => {
  // * this is how to set up web3 with a private key for automatic ECDSA
  // * signing of the messages
  const provider = new Web3.providers.HttpProvider(
    `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
  );
  const web3 = new Web3(provider);

  // ! this may be quite dangerous to do in the mobile app
  // ! if your phone is compromised through a hack, your funds are lost
  // !!! This is a fake private key for testing purposes. do not use
  const privateKey = process.env.PRIVATE_KEY;
  const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  await payEth({
    ethAmount: 0.01,
    senderAddress: web3.defaultAccount,
    senderUserId: 0,
    web3
  });
};

// to update, you would just call this same function, but with a
// different expBalance value
const updateUserBalance = () => {
  putUserExpBalance({userId: 0, expBalance: 20});
};

const getUserExpBalance = async () => {
  const data = await getUserBalance(0);
  console.debug(data);
};

createTable();
updateUserBalance();
getUserExpBalance();
// payIntoWallet();
