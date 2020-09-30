import 'core-js/stable';
import 'regenerator-runtime/runtime';
import AWS from 'aws-sdk';

import { addresses } from './addresses';

// this is our fixed exchange rate for now
export const ethToExp = 300;

export const updateAwsConfig = () => {
  AWS.config.update({
    region: 'eu-west-2',
    endpoint: 'http://localhost:8000',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
};

export const createTable = () => {
  updateAwsConfig();
  const dyno = new AWS.DynamoDB();

  const params = {
    TableName: 'UserExpBalances',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'N' }],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  const handleError = (err) => {
    if (err.code === 'ResourceInUseException') {
      console.debug('table already created');
      return;
    }
    throw err;
  };

  dyno.createTable(params, (err, data) => {
    if (err) handleError(err);
    console.debug(data);
  });
};

export const getUserBalance = async (userId) => {
  updateAwsConfig();
  const docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: 'UserExpBalances',
    KeyConditionExpression: '#ui = :uival',
    ExpressionAttributeNames: {
      '#ui': 'userId',
    },
    ExpressionAttributeValues: {
      ':uival': Number(userId),
    },
  };

  try {
    const data = await docClient.query(params).promise();
    const expBalance = data.Items[0].expBalance;
    return expBalance;
  } catch (err) {
    console.error(err);
    return;
  }
};

export const putUserExpBalance = ({ userId, expBalance }) => {
  updateAwsConfig();
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: 'UserExpBalances',
    Item: {
      userId,
      expBalance,
    },
  };

  docClient.put(params, (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.debug(data);
  });
};

// lets the user pay into the wallet
// this invokes the update of their EXP balance in DynamoDB
export const payEth = async ({
  ethAmount, // this is the amount in eth
  senderAddress, // this is the ethereum address
  senderUserId, // this is the db id
  web3, // instance of web3
}) => {
  // const receipt = await web3.eth.sendTransaction({
  await web3.eth.sendTransaction({
    from: senderAddress,
    to: addresses.passThroughWallet,
    value: web3.utils.toWei(String(ethAmount), 'ether'),
    gas: '5000000',
  });
  // console.debug("-- Receipt PassThroughWallet", receipt);

  // TODO: assert successful txn before updating the db values

  const currentExpBalance = await getUserBalance(senderUserId);
  const expAcquired = (Number(ethAmount) * ethToExp).toFixed(4);
  const newBalance = Number(currentExpBalance) + Number(expAcquired);

  // no checks here to ensure that table exists. Your responsibility to spin up local
  // in prod, we will just have a url, so no need for this check
  putUserExpBalance({ userId: senderUserId, expBalance: newBalance });
};
