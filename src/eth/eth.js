import Web3 from 'web3';
import Wallet from 'ethereumjs-wallet';
import crypto from 'crypto';
import Tx from 'ethereumjs-tx';
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


let eth_manager = {};
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

// console.log(eth_manager.RPC_url);
const web3 = new Web3(new Web3.providers.HttpProvider(eth_manager.RPC_url));


export const createAccount = (password, cb) => {
  crypto.randomBytes(32,
    (err, key) => {
      let wallet = Wallet.fromPrivateKey(key);
      let keystore = wallet.toV3String(password);
      let keystore_data = JSON.parse(keystore);
      let accountDetails = {
        wallet_address: '0x' + keystore_data.address,
        private_key: key.toString('hex'),
        keystore_data: keystore_data
      }
      cb(null, accountDetails);
    });
}

export const getBalance = (wallet_address, cb) => {

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
  try {
    let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);
    let due_amount = VPN.getDueAmountOf(account_address);
    due_amount = due_amount / Math.pow(10, 18);
    cb(null, due_amount);
  } catch (err) {
    cb({ 'code': 202, 'err': err }, null);
  }
}

export const rawTransaction = (tx_data, cb) => {
  web3.eth.sendRawTransaction(tx_data, (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

export const getVpnUsage = (account_address, cb) => {
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
    for (let index = 0; index < sessions; index++) {
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
  let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);

  web3.eth.getGasPrice((price) => {
    console.log('price :', price);
  })

  let rawTx = {
    nonce: web3.eth.getTransactionCount(COINBASE_ADDRESS),
    // gasPrice: web3.eth.getGasPrice,
    startgas: web3.toHex(1000000),
    gasPrice: web3.toHex(20000000000),
    to: VPNSERVICE_ADDRESS,
    value: '0x0',
    data: VPN.addVpnUsage.getData(from_addr, to_addr, sent_bytes, session_duration, amount, timestamp)
  }
  let tx = new Tx(rawTx);
  tx.sign(Buffer(COINBASE_PRIVATE_KEY));
  var serializedTx = tx.serialize();
  web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'),
    (err, txHash) => {
      console.log('error', err);

      if (err) cb(err, null);
      else cb(null, txHash);
    });
}

const sendRawTransaction = (tx_data, cb) => {
  web3.eth.sendRawTransaction(tx_data, (err, res) => {
    if (!err) cb(null, res);
    else cb(err, null);
  });
}

const payVpnSession = (account_addr, amount, session_id, cb) => {
  try {
    let rawTx = {
      nonce: web3.eth.getTransactionCount(COINBASE_ADDRESS),
      gasPrice: web3.toHex(20000000000),
      startgas: web3.toHex(1000000),
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
  let errors = [], tx_hashes = [];
  sendRawTransaction(tx_data,
    (err, tx_hash) => {
      if (!err) {
        tx_hashes.append(tx_hash);
        payVpnSession(from_addr, amount, session_id,
          (err, tx_hash) => {
            if (!err) {
              tx_hashes.append(tx_hash);
              cb(errors, tx_hashes)
            } else {
              errors.append(err);
              cb(errors, tx_hashes)
            }
          })
      }
      else {
        errors.append(err)
        cb(errors, tx_hashes);
      }
    })
}

//getBlockNumber()
//getGasPrice()