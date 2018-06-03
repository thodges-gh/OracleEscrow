var OracleEscrow = artifacts.require("OracleEscrow");
var Oracle = artifacts.require("Oracle");

module.exports = function(deployer, accounts) {
  deployer.deploy(Oracle, "no").then(function() {
    deployer.deploy(OracleEscrow, Oracle.address, web3.eth.accounts[1].address, web3.eth.accounts[2].address, {from: web3.eth.accounts[0]});
  });
};
