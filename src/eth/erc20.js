import Tx from 'ethereumjs-tx'
import { ETHManager, mainnet, rinkeby, eth_manager } from './eth'
import {
  DECIMALS,
  SENTINEL_ABI,
  SENTINEL_ADDRESS,
  SENTINEL_NAME,
  SENTINEL_TEST_ABI,
  SENTINEL_TEST_ADDRESS,
  SENTINEL_TEST_NAME
} from '../utils/config'
import { MAIN_TOKENS, RINKEBY_TOKENS } from '../config/tokens';

// let SENT = mainnet.web3.eth.contract(SENTINEL_ABI).at(SENTINEL_ADDRESS);

function ERC20Manager(net, name, address, abi) {
  this.net = net
  this.address = address
  this.contract = net.web3.eth.contract(abi).at(address)
}

ERC20Manager.prototype.getBalance = function (accountAddr, cb) {
  this.contract.balanceOf(accountAddr,
    (err, balance) => {
      cb(err, balance)
    })
}

ERC20Manager.prototype.transferAmount = function (toAddr, amount, privateKey, nonce, cb) {
  let rawTx = {
    nonce: nonce,
    gasPrice: rinkeby.web3.toHex(this.net.web3.eth.gasPrice),
    gasLimit: rinkeby.web3.toHex(500000),
    to: this.address,
    value: '0x0',
    data: this.contract.transfer.getData(toAddr, amount)
  }
  let tx = new Tx(rawTx);
  tx.sign(Buffer.from(privateKey, 'hex'));
  let serializedTx = tx.serialize();
  this.net.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, txHash) => {
    cb(err, txHash)
  })
}

module.exports.SentinelMain = new ERC20Manager(mainnet, SENTINEL_NAME, SENTINEL_ADDRESS, SENTINEL_ABI)
module.exports.SentinelRinkeby = new ERC20Manager(rinkeby, SENTINEL_TEST_NAME, SENTINEL_TEST_ADDRESS, SENTINEL_TEST_ABI)

let erc20_manager = {
  'main': '',
  'rinkeby': ''
}

let mainKeys = Object.keys(MAIN_TOKENS);
let rinkebyKeys = Object.keys(RINKEBY_TOKENS);

for (let i = 0; i < mainKeys.length; i++) {
  let token = MAIN_TOKENS[mainKeys[i]]
  erc20_manager['main'][mainKeys[i]] = new ERC20Manager(eth_manager['main'], token['name'], token['address'], token['abi'])
}

for (let i = 0; i < rinkebyKeys.length; i++) {
  let token = RINKEBY_TOKENS[rinkebyKeys[i]]
  erc20_manager['rinkeby'][rinkebyKeys[i]] = new ERC20Manager(eth_manager['main'], token['name'], token['address'], token['abi'])
}

module.exports = {
  ERC20Manager: erc20_manager
}