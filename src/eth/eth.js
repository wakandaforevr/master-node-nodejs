import Web3 from 'web3';
import hdkey from 'ethereumjs-wallet/hdkey'
import Wallet from 'ethereumjs-wallet';
import crypto from 'crypto';
import Tx from 'ethereumjs-tx';
import async from 'async';
import keythereum from 'keythereum'
import {
  SENTINEL_ADDRESS,
  SENTINEL_ABI,
  SENTINEL_NAME,
  VPNSERVICE_ABI,
  VPNSERVICE_ADDRESS,
  DECIMALS,
  COINBASE_ADDRESS,
  COINBASE_PRIVATE_KEY
} from '../utils/config'

function ETHManager(provider = null, rpcURL = null) {
  this.provider = provider;
  this.web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));
}

ETHManager.prototype.createAccount = function (password, cb) {
  try {
    const privateKey = hdkey.fromMasterSeed('random')._hdkey._privateKey
    const wallet = Wallet.fromPrivateKey(privateKey)
    const keystore = wallet.toV3String(password)
    const keystoreData = JSON.parse(keystore);
    const accountDetails = {
      walletAddress: '0x' + keystoreData.address,
      privateKey: '0x' + privateKey.toString('hex'),
      keystoreData: keystoreData
    }
    cb(null, accountDetails)
  } catch (error) {
    cb({ 'code': 101, 'error': error }, null);
  }
}

ETHManager.prototype.getPrivateKey = function (keystoreData, password, cb) {
  let keyStore = JSON.parse(keystoreData);
  keythereum.recover(password, keyStore, (err, privateKey) => {
    if (err) cb({ 'code': 102, 'error': err }, null)
    else cb(null, privateKey)
  })
}

ETHManager.prototype.getAddress = function (privateKey, cb) {
  try {
    const wallet = Wallet.fromPrivateKey(privateKey);
    const address = wallet.getAddressString();

    cb(null, address);
  } catch (error) {
    cb({ 'code': 103, 'error': error }, null);
  }
}

ETHManager.prototype.getBalance = function (accountAddr, cb) {
  this.web3.eth.getBalance(accountAddr, (err, balance) => {
    cb({ 'code': 104, 'error': err }, balance);
  })
}

ETHManager.prototype.getTransactionCount = function (accountAddr, cb) {
  this.web3.eth.getTransactionCount(accountAddr, 'pending', (err, txCount) => {
    cb({ 'code': 105, 'error': error }, txCount);
  })
}

ETHManager.prototype.sendRawTransaction = function (txData, cb) {
  txData = txData.toString();
  this.web3.eth.sendRawTransaction(txData, (err, txHash) => {
    console.log('error', err);
    if (err) cb({ 'code': 106, 'error': err }, null);
    else cb(null, txHash);
  })
}

ETHManager.prototype.transferAmount = function (fromAddr, toAddr, amount, privateKey, cb) {
  let rawTx = {
    nonce: this.web3.toHex(500000),
    gasPrice: this.web3.toHex(5000000000),
    gasLimit: this.web3.toHex(500000),
    to: toAddr,
    value: amount,
    data: ''
  }
  let tx = new Tx(rawTx);
  tx.sign(new Buffer(privateKey));
  let serializedTx = tx.serialize();
  this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, txHash) => {
    if (err) cb({ 'code': 107, 'error': err }, null)
    else cb(null, txHash)
  })
}

ETHManager.prototype.gettransactionreceipt = function (txHash, cb) {
  this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
    if (err) cb({ 'code': 108, 'error': err }, null);
    else cb(null, receipt);
  })
}

ETHManager.prototype.getTransaction = function (txHash, cb) {
  this.web3.eth.getTransaction(txHash, (err, receipt) => {
    if (err) cb({ 'code': 109, 'error': err }, null);
    else cb(null, receipt);
  })
}

if (process.env.SENT_ENV === 'PROD') {
  module.exports.ETHManager = new ETHManager('rpc', 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy')
  module.exports.mainnet = new ETHManager('rpc', 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy')
} else {
  module.exports.ETHManager = new ETHManager('rpc', 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy')
  module.exports.mainnet = new ETHManager('rpc', 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy')
}

module.exports.rinkeby = new ETHManager('rpc', 'https://rinkeby.infura.io/aiAxnxbpJ4aG0zed1aMy')