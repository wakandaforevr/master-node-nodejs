import { rinkeby, mainnet } from './eth'
// import web3 from 'web3'
import Tx from 'ethereumjs-tx';
import {
  VPNSERVICE_ABI,
  VPNSERVICE_ADDRESS,
  VPNSERVICE_NAME,
  COINBASE_ADDRESS,
  COINBASE_PRIVATE_KEY
} from '../utils/config'

let VPN = rinkeby.web3.eth.contract(VPNSERVICE_ABI).at(VPNSERVICE_ADDRESS);

export const payvpnsession = (account_addr, amount, session_id, cb) => {
  let rawTx = {
    nonce: rinkeby.web3.toHex(500000),
    gasPrice: rinkeby.web3.toHex(5000000000),
    gasLimit: rinkeby.web3.toHex(500000),
    to: VPNSERVICE_ADDRESS,
    value: '0x0',
    data: VPN.payVpnSession.getData(account_addr, amount, session_id)
  }
  let tx = new Tx(rawTx);
  tx.sign(Buffer.from(COINBASE_PRIVATE_KEY, 'hex'));
  var serializedTx = tx.serialize();
  rinkeby.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

export const setinitialpayment = (account_addr, is_payed = true) => {
  let rawTx = {
    nonce: rinkeby.web3.toHex(500000),
    gasPrice: rinkeby.web3.toHex(5000000000),
    gasLimit: rinkeby.web3.toHex(500000),
    to: VPNSERVICE_ADDRESS,
    value: '0x0',
    data: VPN.setInitialPaymentOf.getData(account_addr, is_payed)
  }
  let tx = new Tx(rawTx);
  tx.sign(new Buffer(COINBASE_PRIVATE_KEY));
  let serializedTx = tx.serialize();
  rinkeby.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), (err, tx_hash) => {
    cb(err, tx_hash)
  })
}

export const getdueamount = (account_addr, cb) => {
  VPN.getDueAmountOf(account_addr, { from: COINBASE_ADDRESS },
    (err, rawDueAmount) => {
      let due_amount = Number(rawDueAmount.c[0]);
      due_amount = due_amount / Math.pow(10, 18);
      cb(err, due_amount)
    });
}

export const getvpnsessions = (account_addr, cb) => {
  VPN.getVpnSessionsOf(account_addr, { from: COINBASE_ADDRESS },
    (err, rawSessions) => {
      let sessions = Number(rawSessions.c[0]);
      cb(err, sessions)
    });
}

export const getinitialpayment = (account_addr, cb) => {
  VPN.getInitialPaymentOf(account_addr, { from: COINBASE_ADDRESS },
    (err, isPayed) => {
      cb(null, isPayed);
    })
}

export const getvpnusage = (account_addr, index, cb) => {
  VPN.getVpnUsageOf(account_addr, index, { from: COINBASE_ADDRESS }, (err, usage) => {
    cb(err, usage)
  })
}

export const addVpnUsage = (from_addr, to_addr, sent_bytes, session_duration, amount, timestamp, cb) => {
  rinkeby.web3.eth.getBalance(COINBASE_ADDRESS, (err, balance) => {
    console.log('balance', Number(balance))
  })
  try {
    let rawTx = {
      nonce: rinkeby.web3.toHex(500000),
      gasPrice: rinkeby.web3.toHex(5000000000),
      gasLimit: rinkeby.web3.toHex(500000),
      to: VPNSERVICE_ADDRESS,
      value: '0x0',
      data: VPN.addVpnUsage.getData(from_addr, to_addr, sent_bytes, session_duration, amount, timestamp)
    }

    let tx = new Tx(rawTx);
    tx.sign(Buffer.from(COINBASE_PRIVATE_KEY, 'hex'));
    let serializedTx = tx.serialize();
    rinkeby.web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'),
      (err, txHash) => {
        if (err) cb(err, null);
        else cb(null, txHash);
      });
  } catch (error) {
    cb(cb, null)
  }
}