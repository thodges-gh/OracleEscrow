"use strict";

var OracleEscrow = artifacts.require("OracleEscrow.sol");
var Oracle = artifacts.require("Oracle.sol");

contract("OracleEscrow", () => {
  let tryCatch = require("../helpers.js").tryCatch;
  let errTypes = require("../helpers.js").errTypes;
  let tryFullError = require("../helpers.js").tryFullError;
  let owner = web3.eth.accounts[0];
  let depositor = web3.eth.accounts[1];
  let beneficiary = web3.eth.accounts[2];
  let stranger = web3.eth.accounts[3];

  let oracleEscrow, oracleContract;

  const DEPOSIT_AMOUNT = 1;
  const THIRTY_ONE_DAYS = 2678400;

  let sendTransaction = async function sendTransaction(params) {
    return await web3.eth.sendTransaction(params);
  };

  let newOracleEscrow = async function newOracleEscrow() {
    return await OracleEscrow.new(oracleContract.address, depositor, beneficiary, {from: owner});
  };

  let placeDeposit = async function placeDeposit() {
    return await web3.eth.sendTransaction({
      from: depositor,
      to: oracleEscrow.address,
      value: web3.toWei(DEPOSIT_AMOUNT, "ether")
    });
  };

  let increaseTime = async function increaseTime() {
    await web3.currentProvider.send({
      jsonrpc: "2.0", 
      method: "evm_increaseTime", 
      params: [THIRTY_ONE_DAYS], id: 0
    });
  };
  
  before(async function () {
    oracleContract = await Oracle.new("no", {from: owner});
    oracleEscrow = await newOracleEscrow();
  });

  it("stores the expected value", async function () {
    const value = await oracleEscrow.EXPECTED();
    assert.equal("yes", web3.toUtf8(value));
  });

  it("stores the given depositor address", async function () {
    const value = await oracleEscrow.depositor();
    assert.equal(depositor, value);
  });

  it("stores the given beneficiary address", async function () {
    const value = await oracleEscrow.beneficiary();
    assert.equal(beneficiary, value);
  });

  it("does not accept payment from beneficiary", async function () {
    await tryCatch(sendTransaction({
      from: beneficiary,
      to: oracleEscrow.address,
      value: web3.toWei(DEPOSIT_AMOUNT, "ether")
    }), errTypes.revert);
    assert.equal(await web3.eth.getBalance(oracleEscrow.address), 0);
  });

  it("does not accept payment from owner", async function () {
    await tryCatch(sendTransaction({
      from: owner,
      to: oracleEscrow.address,
      value: web3.toWei(DEPOSIT_AMOUNT, "ether")
    }), errTypes.revert);
    assert.equal(await web3.eth.getBalance(oracleEscrow.address), 0);
  });

  it("does not accept payment from stranger", async function () {
    await tryCatch(sendTransaction({
      from: stranger,
      to: oracleEscrow.address,
      value: web3.toWei(DEPOSIT_AMOUNT, "ether")
    }), errTypes.revert);
    assert.equal(await web3.eth.getBalance(oracleEscrow.address), 0);
  });

  it("accepts payment from depositor", async function () {
    await placeDeposit();
    assert.equal(await web3.eth.getBalance(oracleEscrow.address), web3.toWei(DEPOSIT_AMOUNT, "ether"));
  });

  it("retains balance", async function () {
    const value = await web3.eth.getBalance(oracleEscrow.address);
    assert.equal(web3.toWei(DEPOSIT_AMOUNT, "ether"), value);
  });

  describe("#requestOracleValue", () => {
    it("can read the oracle contract value", async function () {
      const value = await oracleEscrow.requestOracleValue({
        from: owner
      });
      assert.equal("no", web3.toUtf8(value));
    });

    it("can only be called by owner", async function () {
      const depositorRead = await tryCatch(oracleEscrow.requestOracleValue({
        from: depositor
      }), errTypes.revert);
      assert.equal(undefined, depositorRead);
      const beneficiaryRead = await tryCatch(oracleEscrow.requestOracleValue({
        from: beneficiary
      }), errTypes.revert);
      assert.equal(undefined, beneficiaryRead);
      const strangerRead = await tryCatch(oracleEscrow.requestOracleValue({
        from: stranger
      }), errTypes.revert);
      assert.equal(undefined, strangerRead);
    });

    it("does not accept payment", async function () {
      await tryCatch(oracleEscrow.requestOracleValue({
        from: depositor,
        value: web3.toWei(1, "szabo")
      }), errTypes.revert);
      assert.equal(await web3.eth.getBalance(oracleEscrow.address), web3.toWei(DEPOSIT_AMOUNT, "ether"));
    });
  });

  describe("#executeContract", () => {
    it("may be called by owner", async function () {
      await oracleEscrow.executeContract({
        from: owner
      });
    });

    it("may be called by depositor", async function () {
      await oracleEscrow.executeContract({
        from: depositor
      });
    });

    it("may be called by beneficiary", async function () {
      await oracleEscrow.executeContract({
        from: beneficiary
      });
    });

    it("does not accept payment", async function () {
      await tryFullError(oracleEscrow.executeContract({
        from: depositor,
        value: web3.toWei(1, "szabo")
      }), errTypes.nonPayableFunction);
      assert.equal(await web3.eth.getBalance(oracleEscrow.address), web3.toWei(DEPOSIT_AMOUNT, "ether"));
    });

    it("does not execute without the expected value", async function () {
      await oracleEscrow.executeContract({
        from: depositor
      });
      assert.equal(false, await oracleEscrow.contractExecuted());
      assert.equal(await web3.eth.getBalance(oracleEscrow.address), web3.toWei(DEPOSIT_AMOUNT, "ether"));
    });

    it("refunds the depositor after the expiration without expected value", async function () {
      await increaseTime();
      const depositorStartBalance = await web3.eth.getBalance(depositor);
      await oracleEscrow.executeContract({
        from: owner
      });
      const depositorEndBalance = await web3.eth.getBalance(depositor);
      assert.equal(await web3.eth.getBalance(oracleEscrow.address), web3.toWei(0, "ether"));
      assert.equal(true, await oracleEscrow.contractExecuted());
      assert.isAbove(web3.eth.getBlock(web3.eth.blockNumber).timestamp, await oracleEscrow.expiration());
      assert.isAbove(depositorEndBalance, depositorStartBalance);
    });

    it("does not execute when called by an unauthorized user", async function () {
      oracleEscrow = await newOracleEscrow();
      await placeDeposit();
      await oracleContract.update("yes");
      await tryCatch(oracleEscrow.executeContract({
        from: stranger
      }), errTypes.revert);
      assert.equal(false, await oracleEscrow.contractExecuted());
    });

    it("pays the beneficiary when expected value is met", async function () {
      oracleEscrow = await newOracleEscrow();
      await placeDeposit();
      await oracleContract.update("yes");
      const value = await oracleEscrow.requestOracleValue();
      const expected = await oracleEscrow.EXPECTED();
      assert.equal(web3.toUtf8(expected), web3.toUtf8(value));
      const beneficiaryStartBalance = await web3.eth.getBalance(beneficiary);
      await oracleEscrow.executeContract({
        from: beneficiary
      });
      const beneficiaryEndBalance = await web3.eth.getBalance(beneficiary);
      assert.equal(true, await oracleEscrow.contractExecuted());
      assert.isAbove(beneficiaryEndBalance, beneficiaryStartBalance);
    });

    it("pays the beneficiary after the expiration when expected value is met", async function () {
      oracleEscrow = await newOracleEscrow();
      await placeDeposit();
      await oracleContract.update("yes");
      const value = await oracleEscrow.requestOracleValue();
      const expected = await oracleEscrow.EXPECTED();
      assert.equal(web3.toUtf8(expected), web3.toUtf8(value));
      await increaseTime();
      const beneficiaryStartBalance = await web3.eth.getBalance(beneficiary);
      await oracleEscrow.executeContract({
        from: depositor
      });
      const beneficiaryEndBalance = await web3.eth.getBalance(beneficiary);
      assert.equal(true, await oracleEscrow.contractExecuted());
      assert.isAbove(web3.eth.getBlock(web3.eth.blockNumber).timestamp, await oracleEscrow.expiration());
      assert.isAbove(beneficiaryEndBalance, beneficiaryStartBalance);
    });

  });

});