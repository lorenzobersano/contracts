# Develop

You will need a local DynamoDB instance running

Follow this [tutorial](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.JavaScript.html)

--
You will also need to fill out the AWS keys in the `.env.develop.exampl` file and then create a copy of it and call it `.env.develop`. To run some examples, call

```zsh
yarn test
```

this will babel transpile our js files and will call the functions in `test/testMain.js`. You may wish to uncomment / comment as required

--
Useful commands follow

If you would like to list the local tables, run

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

If you would like to list the items, in the local tables, run

```zsh
aws dynamodb scan --table-name UserExpBalances --endpoint-url http://localhost:8000
```

You will need to have specified AWS env keys (check out the [.env.develop.example](./src/.env.develop.example) in src/)

## React-Native AWS-SDK

See [here](https://www.npmjs.com/package/aws-sdk)
