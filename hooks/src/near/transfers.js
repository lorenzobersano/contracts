import Tree from 'merkle-patricia-tree';
import BN from 'bn.js';
import { encode } from 'eth-util-lite';
import { Header, Proof, Receipt, Log } from 'eth-object';
import { promisfy } from 'promisfy';
// import { ulid } from 'ulid';
import utils from 'ethereumjs-util';
// import getRevertReason from 'eth-revert-reason';
import { Contract, keyStores, WalletConnection, Near } from 'near-api-js';
import EthOnNearClient from './borsh/ethOnNearClient';
import Web3 from 'web3';

import * as urlParams from './urlParams';

import erc20Abi from './abis/erc20.abi';
import tokenLockerAbi from './abis/TokenLocker.full.abi';

// ---- INIT ----
// * window.web3: constructing a Proof of the `Locked` event currently has deep
//   coupling with the web3.js library. Make initialized library available here.
// * window.erc20: a web3.js `Contract` instance for ERC20 token at address
//   `process.env.ethErc20Address`
// * window.tokenLocker: a web3.js `Contract` instance for the TokenLocker
//   contract at address `process.env.ethLockerAddress`
// * window.nep21: a near-api-js `Contract` instance for the `MintableFungibleToken`
//   contract that mints a corresponding NEP21 token on NEAR
// * window.ethOnNearClient: similar to a near-api-js `Contract` instance, but
//   using a custom wrapper to handle Borsh serialization. See https://borsh.io
//   and the code in ./authNear.js. This will be streamlined and added to
//   near-api-js soon.
// * window.ethUserAddress: address of authenticated Ethereum wallet to send from
// * window.nearUserAddress: address of authenticated NEAR wallet to send to
// * window.ethErc20Name: used to fill in error messages when tranfers fail
var window = {};

process.env.ethErc20AbiText = erc20Abi;
process.env.ethLockerAbiText = tokenLockerAbi;

// Initiate a new transfer of 'amount' ERC20 tokens to NEAR.
// Currently depends on many global variables:
export async function initiate(amount, callback) {
  // const approvalHash = await initiateApproval(amount);
  await initiateApproval(amount);
}

// Return a human-readable description of the status for a given transfer
export function humanStatusFor(transfer) {
  return statusMessages[transfer.status](transfer);
}

// Clear a transfer from localStorage
export function clear(id) {
  const transfers = getRaw();
  delete transfers[id];
  localStorage.set(STORAGE_KEY, transfers);
}

const STORAGE_KEY = 'rainbow-bridge-transfers';

// Get raw transfers, stored in localStorage as an object indexed by keys
function getRaw() {
  return localStorage.get(STORAGE_KEY) || {};
}

// transfer statuses & outcomes
const INITIATED_APPROVAL = 'initiated_approval';
const INITIATED_LOCK = 'initiated_lock';
const LOCKED = 'locked';
const COMPLETE = 'complete';
const SUCCESS = 'success';

// statuses used in humanStatusFor.
// Might be internationalized or moved to separate library in the future.
const statusMessages = {
  [INITIATED_APPROVAL]: () => 'approving TokenLocker',
  [INITIATED_LOCK]: () => 'locking',
  [LOCKED]: ({ progress, neededConfirmations }) =>
    `${progress}/${neededConfirmations} blocks synced`,
  [COMPLETE]: ({ outcome, error }) =>
    outcome === SUCCESS ? 'Success!' : error,
};

// Call window.erc20, requesting permission for window.tokenLocker to transfer
// 'amount' tokens on behalf of the default erc20 user set up in
// authEthereum.js.
// Only wait for transaction to have dependable transactionHash created. Avoid
// blocking to wait for transaction to be mined. Status of transactionHash
// being mined is then checked in checkStatus.
function initiateApproval(amount) {
  return new Promise((resolve, reject) => {
    window.erc20.methods
      .approve(process.env.ethLockerAddress, amount)
      .send()
      .on('transactionHash', resolve)
      .catch(reject);
  });
}

// Call window.tokenLocker, locking 'amount' tokens.
// Only wait for transaction to have dependable transactionHash created. Avoid
// blocking to wait for transaction to be mined. Status of transactionHash
// being mined is then checked in checkStatus.
function initiateLock(amount) {
  return new Promise((resolve, reject) => {
    window.tokenLocker.methods
      .lockToken(amount, window.nearUserAddress)
      .send()
      .on('transactionHash', resolve)
      .catch(reject);
  });
}

// Mint NEP21 tokens to window.nearUserAddress after successfully locking them
// in window.tokenLocker and waiting for neededConfirmations to propogate into
// window.ethOnNearClient
async function mint(transfer) {
  const balanceBefore = Number(
    await window.nep21.get_balance({ owner_id: window.nearUserAddress })
  );
  urlParams.set({ minting: transfer.id, balanceBefore });

  const proof = await findProof(transfer);

  await window.nep21.mint_with_json(
    { proof },
    new BN('300000000000000'),
    // We need to attach tokens because minting increases the contract state, by <600 bytes, which
    // requires an additional 0.06 NEAR to be deposited to the account for state staking.
    // Note technically 0.0537 NEAR should be enough, but we round it up to stay on the safe side.
    new BN('100000000000000000000').mul(new BN('600'))
  );
}

// Compute proof that Locked event was fired in Ethereum.
// This proof can then be passed to window.nep21, which verifies the proof
// against a Prover contract.
async function findProof(transfer) {
  const receipt = await window.web3.eth.getTransactionReceipt(
    transfer.lockReceipt.transactionHash
  );
  const block = await window.web3.eth.getBlock(
    transfer.lockReceipt.blockNumber
  );
  const tree = await buildTree(block);
  const proof = await extractProof(block, tree, receipt.transactionIndex);

  const [lockedEvent] = await window.tokenLocker.getPastEvents('Locked', {
    filter: { transactionHash: transfer.lockHash },
    fromBlock: transfer.lockReceipt.blockNumber,
  });
  // `log.logIndex` does not necessarily match the log's order in the array of logs
  const logIndexInArray = receipt.logs.findIndex(
    (l) => l.logIndex === lockedEvent.logIndex
  );
  const log = receipt.logs[logIndexInArray];

  return {
    log_index: logIndexInArray,
    log_entry_data: Array.from(Log.fromWeb3(log).serialize()),
    receipt_index: proof.txIndex,
    receipt_data: Array.from(Receipt.fromWeb3(receipt).serialize()),
    header_data: Array.from(proof.header_rlp),
    proof: Array.from(proof.receiptProof)
      .map(utils.rlp.encode)
      .map((b) => Array.from(b)),
  };
}

async function buildTree(block) {
  const blockReceipts = await Promise.all(
    block.transactions.map((t) => window.web3.eth.getTransactionReceipt(t))
  );

  // Build a Patricia Merkle Trie
  const tree = new Tree();
  await Promise.all(
    blockReceipts.map((receipt) => {
      const path = encode(receipt.transactionIndex);
      const serializedReceipt = Receipt.fromWeb3(receipt).serialize();
      return promisfy(tree.put, tree)(path, serializedReceipt);
    })
  );

  return tree;
}

async function extractProof(block, tree, transactionIndex) {
  const [, , stack] = await promisfy(
    tree.findPath,
    tree
  )(encode(transactionIndex));

  const blockData = await window.web3.eth.getBlock(block.number);
  // Correctly compose and encode the header.
  const header = Header.fromWeb3(blockData);
  return {
    header_rlp: header.serialize(),
    receiptProof: Proof.fromStack(stack),
    txIndex: transactionIndex,
  };
}

export const init = async () => {
  // eth
  // logging into web3 with a private key
  window.web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
    )
  );
  const privateKey = process.env.PRIVATE_KEY;
  const account = window.web3.eth.accounts.privateKeyToAccount(
    '0x' + privateKey
  );
  window.web3.eth.accounts.wallet.add(account);
  window.web3.eth.defaultAccount = account.address;

  window.ethUserAddress = window.web3.eth.defaultAccount;

  window.erc20 = new window.web3.eth.Contract(
    JSON.parse(process.env.ethErc20AbiText),
    process.env.ethErc20Address,
    { from: window.ethUserAddress }
  );

  try {
    window.ethErc20Name = await window.erc20.methods.symbol().call();
  } catch (e) {
    window.ethErc20Name = process.env.ethErc20Address.slice(0, 5) + '…';
  }

  window.tokenLocker = new window.web3.eth.Contract(
    JSON.parse(process.env.ethLockerAbiText),
    process.env.ethLockerAddress,
    { from: window.ethUserAddress }
  );

  window.ethInitialized = true;

  // authNear
  // Create a Near config object
  const near = new Near({
    keyStore: new keyStores.BrowserLocalStorageKeyStore(),
    networkId: process.env.nearNetworkId,
    nodeUrl: process.env.nearNodeUrl,
    helperUrl: process.env.nearHelperUrl,
    walletUrl: process.env.nearWalletUrl,
  });

  // Initialize main interface to NEAR network
  window.nearConnection = new WalletConnection(near);

  // Getting the Account ID. If still unauthorized, it's an empty string
  window.nearUserAddress = window.nearConnection.getAccountId();
  // How to sign in without the prompt?
  window.nearConnection.requestSignIn(process.env.nearFunTokenAccount);

  window.nep21 = await new Contract(
    window.nearConnection.account(),
    process.env.nearFunTokenAccount,
    {
      // View methods are read only
      viewMethods: ['get_balance'],
      // Change methods modify state but don't receive updated data
      changeMethods: ['mint_with_json'],
    }
  );

  window.ethOnNearClient = await new EthOnNearClient(
    window.nearConnection.account(),
    process.env.nearClientAccount
  );

  window.nearInitialized = true;
};
