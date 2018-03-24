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

function ETHManager(provider = null, RPC_url = null) {
  this.provider = provider;
  this.web3 = new Web3(new Web3.providers.HttpProvider(RPC_url));
}

ETHManager.prototype.createaccount = function (password, cb) {
  try {
    const private_key = hdkey.fromMasterSeed('random')._hdkey._privateKey
    const wallet = Wallet.fromPrivateKey(private_key)
    const keystore = wallet.toV3String(password)
    const keystore_data = JSON.parse(keystore);
    const account_details = {
      wallet_address: '0x' + keystore_data.address,
      private_key: '0x' + private_key.toString('hex'),
      keystore_data: keystore_data
    }
    cb(null, account_details)
  } catch (error) {
    cb(error, null);
  }
}

ETHManager.prototype.getprivatekey = function (keystore_data, password, cb) {
  let key_store = JSON.parse(keystore_data);
  keythereum.recover(password, key_store, (err, private_key) => {
    if (err) cb(err, null)
    else cb(null, private_key)
  })
}

ETHManager.prototype.getaddress = function (private_key, cb) {
  try {
    const wallet = Wallet.fromPrivateKey(private_key);
    const address = wallet.getAddressString();
    cb(null, address);
  } catch (error) {
    cb(error, null);
  }
}

ETHManager.prototype.getbalance = function (account_addr, cb) {
  this.web3.eth.getBalance(account_addr, (err, balance) => {
    cb(err, balance);
  })
}

ETHManager.prototype.sendrawtransaction = function (tx_data, cb) {
  this.web3.eth.sendRawTransaction(tx_data, (err, tx_hash) => {
    console.log('err', err, tx_hash, this.web3.currentProvider)
    if (err) cb(err, null);
    else cb(null, tx_hash);
  })
}

ETHManager.prototype.transferamount = function (from_addr, to_addr, amount, private_key, cb) {
  let rawTx = {
    nonce: this.web3.toHex(500000),
    gasPrice: this.web3.toHex(5000000000),
    gasLimit: this.web3.toHex(500000),
    to: to_addr,
    value: amount,
    data: ''
  }
  let tx = new Tx(rawTx);
  tx.sign(new Buffer(private_key));
  let serializedTx = tx.serialize();
  this.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

ETHManager.prototype.gettransactionreceipt = function (tx_hash, cb) {
  this.web3.eth.getTransactionReceipt(tx_hash, (err, receipt) => {
    if (err) cb(err, null);
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