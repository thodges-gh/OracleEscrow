# Oracle Escrow Contract

The [Oracle Escrow](https://github.com/thodges-gh/OracleEscrow/blob/master/contracts/OracleEscrow.sol) contract works much like a traditional [escrow agreement](https://www.investopedia.com/terms/e/escrowagreement.asp) in that it allows for a depositor to safely pay a beneficiary when the terms of the contract have been met. However, it removes the need for trusting the agent with the escrow funds. The agent, which is the [owner](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/ownership/Ownable.sol) of the contract, has no control over the funds once the contract has been deployed. The agent may be changed, or even removed completely, and the contract will still execute based on its terms. Only the depositor may place the escrow funds. 

The contract makes use of the Ethereum oracle contract at [SmartContract.com](https://www.smartcontract.com/). It allows for the value read from the oracle contract to determine execution of payment. When this contract is deployed, it should have an expected value and expiration date set that all parties agree on. Before making a deposit, all parties may inspect the publicly visible expected value and expiration date. All parties may also, at any time, inspect the current value read from the oracle contract to determine whether or not to execute the contract.

The contract may only be executed by the agent (owner), depositor, or beneficiary. If the expected value is the same as what is read from the oracle contract, the escrow funds go to the beneficiary. If the expiration date has passed and the expected value has still not been met, the depositor is refunded. However, if the expiration date has passed and the expected value _has_ been met, the escrow will still go to the beneficiary. 

### Deployment Parameters

- Oracle contract address
- Depositor address
- Beneficiary address

### Values to change

Only two values should be changed by the agent when deploying the contract:

- `EXPECTED` - the expected value that the oracle contract should read.
- `TO_EXPIRE` - the number of days after the contract has been deployed for it to expire.

These should be inspected by the depositor and beneficiary before depositing to, or using the contract.

### Building

```bash
$ npm install
$ truffle compile
```

### Testing

```bash
$ ./node_modules/.bin/ganache-cli
$ truffle test --network development
```

### Solium lint

```bash
$ npm run-script lint:sol
```

### JavaScript lint

```bash
$ npm run-script lint
```