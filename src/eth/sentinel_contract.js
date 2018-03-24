import { ETHManager, mainnet, rinkeby } from './eth'
import {
  DECIMALS,
  SENTINEL_ABI,
  SENTINEL_ADDRESS,
  SENTINEL_NAME,
  SENTINEL_TEST_ABI,
  SENTINEL_TEST_ADDRESS,
  SENTINEL_TEST_NAME
} from '../utils/config'
import Tx from 'ethereumjs-tx'

let SENT = mainnet.web3.eth.contract(SENTINEL_ABI).at(SENTINEL_ADDRESS);

function SentinelManager(net, name, address, abi) {
  this.net = net
  this.address = address
  this.contract = net.web3.eth.contract(abi).at(address)
}

SentinelManager.prototype.getbalance = function (account_addr, cb) {
  this.net.web3.eth.getBalance(account_addr,
    (err, balance) => {
      cb(err, balance)
    })
}

SentinelManager.prototype.transferamount = function (from_addr, to_addr, amount, private_key, cb) {
  let rawTx = {
    nonce: rinkeby.web3.toHex(500000),
    gasPrice: rinkeby.web3.toHex(5000000000),
    gasLimit: rinkeby.web3.toHex(500000),
    to: this.address,
    value: '0x0',
    data: this.contract.transfer.getData(to_addr, amount)
  }
  let tx = new Tx(rawTx);
  tx.sign(new Buffer(private_key));
  let serializedTx = tx.serialize();
  this.net.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

module.exports.sentinel_main = new SentinelManager(mainnet, SENTINEL_NAME, SENTINEL_ADDRESS, SENTINEL_ABI)
module.exports.sentinel_rinkeby = new SentinelManager(rinkeby, SENTINEL_TEST_NAME, SENTINEL_TEST_ADDRESS, SENTINEL_TEST_ABI)