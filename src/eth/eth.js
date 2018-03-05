import Web3 from 'web3';
import Wallet from 'ethereumjs-wallet';
import crypto from 'crypto';
import {
  SENTINEL_ADDRESS,
  SENTINEL_ABI,
  SENTINEL_NAME,
  VPNSERVICE_ABI,
  VPNSERVICE_ADDRESS,
} from '../utils/config';

var keythereum = require('keythereum');
const ethereumtx = require('ethereumjs-tx');
let eth_manager = {};
let mainnet = {};

if (
  typeof process.env.SENT_ENV == 'undefined' ||
  process.env.SENT_ENV == 'PROD'
) {
  eth_manager.provider = 'rpc';
  eth_manager.RPC_url = 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy';
  mainnet.provider = 'rpc';
  mainnet.RPC_url = 'https://ropsten.infura.io/aiAxnxbpJ4aG0zed1aMy';
} else {
  eth_manager.provider = 'rpc';
  eth_manager.RPC_url = 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy';
  mainnet.provider = 'rpc';
  mainnet.RPC_url = 'https://mainnet.infura.io/aiAxnxbpJ4aG0zed1aMy';
}

// console.log(eth_manager.RPC_url);
const web3 = new Web3(new Web3.providers.HttpProvider(eth_manager.RPC_url));

export const createAccount = (password, cb) => {
  crypto.randomBytes(32, (err, key) => {
    let wallet = Wallet.fromPrivateKey(key);
    let keystore = wallet.toV3String(password);
    let keystore_data = JSON.parse(keystore);
    let accountDetails = {
      wallet_address: '0x' + keystore_data.address,
      private_key: key.toString('hex'),
      keystore_data: keystore_data,
    };
    cb(null, accountDetails);
  });
};

export const getBalance = (wallet_address, cb) => {
  let SENT = web3.eth.contract(SENTINEL_ABI).at(SENTINEL_ADDRESS);
  web3.eth.getBalance(wallet_address, function(err, balance_eth) {
    balance_eth = balance_eth / Math.pow(10, 18);
    if (!err) {
      try {
        let balance_sent = SENT.balanceOf(wallet_address);
        balance_sent = balance_sent / Math.pow(10, 18);
        let balance = {
          sents: balance_sent,
          eths: balance_eth,
        };
        cb(null, balance);
      } catch (error) {
        cb(err, null);
      }
    } else {
      cb(err, null);
    }
  });
};

export const getDueAmount = (account_address, cb) => {
  try {
    let VPN = web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);
    let due_amount = VPN.getDueAmountOf(account_address);
    due_amount = due_amount / Math.pow(10, 18);
    cb(null, due_amount);
  } catch (err) {
    cb({ code: 202, err: err }, null);
  }
};

export const rawTransaction = (tx_data, cb) => {
  web3.eth.sendRawTransaction(tx_data, (err, tx_hash) => {
    cb(err, tx_hash);
  });
};
export const getPrivateKey = (keystore_data, password, cb) => {
  return keythereum.recover(password, keystore_data, privatekey => {
    if (privatekey) cb(null, privatekey);
    else cb({ error: '....' }, null);
  });
};

export const transferAmount = (from_addr, to_addr, amount, private_key, cb) => {
  const txParams = {
    nonce: web3.eth.getTansactionCount(from_addr),
    gasPrice: web3.toHex(web3.eth.gasPrice.c[0]),
    gasLimit: web3.toHex(500000),
    to: to_addr,
    value: web3.toHex(amount),
    data: '',
    // EIP 155 chainId - mainnet: 1, ropsten: 3
  };

  const tx = new EthereumTx(txParams);
  tx.sign(private_key);
  const serializedTx = tx.serialize();
};

export const getTxReceipt = (tx_hash, cb) => {
  web3.eth.getTransactionReceipt(tx_hash, object => {
    if (object) {
      cb(null, object);
    } else {
      cb(err, null);
    }
  });
};

//getBlockNumber()
//getGasPrice()
