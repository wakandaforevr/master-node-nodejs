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

/* let eth_manager = {};
let mainnet = {};

if (typeof (process.env.SENT_ENV) == 'undefined' || process.env.SENT_ENV == 'PROD') {
  eth_manager.provider = 'rpc'
  eth_manager.RPC_url = 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy'
  mainnet.provider = 'rpc'
  mainnet.RPC_url = 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy'
} else {
  eth_manager.provider = 'rpc'
  eth_manager.RPC_url = 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy'
  mainnet.provider = 'rpc'
  mainnet.RPC_url = 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy'
}

let rinkeby = 'https://rinkeby.infura.io/aiAxnxbpJ4aG0zed1aMy';
let web3 = new Web3(new Web3.providers.HttpProvider(eth_manager.RPC_url));

// console.log(eth_manager.RPC_url);

export const setProvider = (provider) => {
  if (provider === 'rinkeby')
    web3 = new Web3(new Web3.providers.HttpProvider(rinkeby));
  else
    web3 = new Web3(new Web3.providers.HttpProvider(eth_manager.RPC_url));
}


export const createAccount = (password, cb) => {
  setProvider('ropsten');
  try {
    crypto.randomBytes(32,
      (err, key) => {
        let wallet = Wallet.fromPrivateKey(key);
        let keystore = wallet.toV3String(password);
        let keystore_data = JSON.parse(keystore);
        let accountDetails = {
          wallet_address: keystore_data.address.toString('hex'),
          private_key: key.toString('hex'),
          keystore_data: keystore_data
        }
        cb(null, accountDetails);
      });
  } catch (error) {
    cb(error, null)
  }
}

export const getBalance = (wallet_address, cb) => {
  // setProvider('ropsten');
  let SENT = web3.eth.contract(SENTINEL_ABI).at(SENTINEL_ADDRESS);
  web3.eth.getBalance(wallet_address, function (err, balance_eth) {
    balance_eth = balance_eth / Math.pow(10, 18);
    if (!err) {
      try {
        let balance_sent = SENT.balanceOf(wallet_address);
        balance_sent = balance_sent / Math.pow(10, 18);
        let balance = {
          sents: balance_sent,
          eths: balance_eth
        }
        cb(null, balance);
      } catch (err) {
        cb(err, null);
      }
    }
    else {
      cb(err, null);
    }
  });
}

export const getDueAmount = (account_address, cb) => {
  setProvider('rinkeby');
  try {
    let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);
    let due_amount = VPN.getDueAmountOf(account_address);
    due_amount = due_amount / Math.pow(10, 18);
    cb(null, due_amount);
  } catch (err) {
    cb({ 'code': 202, 'err': err }, null);
  }
}

export const rawTransactions = (tx_data, cb) => {
  setProvider('rinkeby');
  web3.eth.sendRawTransaction(tx_data, (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

export const getVpnUsage = (account_address, cb) => {
  setProvider('rinkeby');
  let index = 0;
  let usage = {
    'due': 0,
    'stats': {
      'received_bytes': 0,
      'duration': 0,
      'amount': 0
    },
    'sessions': []
  }

  let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);
  try {
    console.log('hello ');
    let sessions = VPN.getVpnSessionsOf(account_address);
    sessions = parseInt(sessions);
    for (index = 0; index < sessions; index++) {
      try {
        console.log('hello 1');
        let _usage = VPN.getVpnUsageOf(account_address, index)
        if (!_usage[5])
          usage['due'] = _usage[3] / (DECIMALS * 1.0);
        usage['stats']['received_bytes'] += _usage[1]
        usage['stats']['duration'] += _usage[2]
        usage['stats']['amount'] += _usage[3] / (DECIMALS * 1.0)
        usage['sessions'].append({
          'id': index,
          'account_addr': _usage[0],
          'received_bytes': _usage[1],
          'duration': _usage[2],
          'amount': _usage[3] / (DECIMALS * 1.0),
          'timestamp': _usage[4],
          'is_payed': _usage[5]
        })
      } catch (error) {
        cb(error, null);
      }
    }
    cb(null, usage);
  } catch (error) {
    cb(error, null);
  }
}

export const addVpnUsage = (from_addr, to_addr, sent_bytes, session_duration, amount, timestamp, cb) => {
  setProvider('rinkeby');

  let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);

  async.waterfall([
    (next) => {
      web3.eth.getGasPrice((err, gasPrice) => {
        if (err) next(err, null)
        else next(null, gasPrice);
      })
    }, (gasPrice, next) => {
      let rawTx = {
        nonce: web3.toHex(500000),
        gasPrice: web3.toHex(gasPrice),
        gasLimit: web3.toHex(500000),
        to: VPNSERVICE_ADDRESS,
        value: '0x0',
        data: VPN.addVpnUsage.getData(from_addr, to_addr, sent_bytes, session_duration, amount, timestamp)
      }
      let tx = new Tx(rawTx);
      tx.sign(new Buffer(COINBASE_PRIVATE_KEY));
      var serializedTx = tx.serialize();
      web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'),
        (err, txHash) => {
          if (err) next(err, null);
          else next(null, txHash);
        });
    }
  ], (err, txHash) => {
    if (err) cb(err, null);
    else cb(null, txHash);
  })
}

const sendRawTransaction = (tx_data, cb) => {
  web3.eth.sendRawTransaction(tx_data, (err, res) => {
    if (!err) cb(null, res);
    else cb(err, null);
  });
}

const payVpnSession = (account_addr, amount, session_id, cb) => {
  let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);
  setProvider('rinkeby');
  try {
    let rawTx = {
      nonce: web3.toHex(500000),
      gasPrice: web3.toHex(5000000000),
      gasLimit: web3.toHex(500000),
      to: VPNSERVICE_ADDRESS,
      value: '0x0',
      data: VPN.payVpnSession.getData(account_addr, amount, session_id)
    }
    let tx = new Tx(rawTx);
    tx.sign(COINBASE_PRIVATE_KEY);
    var serializedTx = tx.serialize();
    let tx_hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'))
    cb(null, tx_hash)
  } catch (error) {
    cb(error, null)
  }
}

export const payVpnUsage = (from_addr, amount, session_id, tx_data, cb) => {
  setProvider('rinkeby');
  let errors = [], tx_hashes = [];
  sendRawTransaction(tx_data,
    (err, tx_hash) => {
      if (!err) {
        tx_hashes.push(tx_hash);
        payVpnSession(from_addr, amount, session_id,
          (err, tx_hash) => {
            if (!err) {
              tx_hashes.push(tx_hash);
              cb(errors, tx_hashes);
            } else {
              errors.push(err);
              cb(errors, tx_hashes)
            }
          })
      }
      else {
        errors.push(err)
        cb(errors, tx_hashes);
      }
    })
}
 */
//getBlockNumber()
//getGasPrice()