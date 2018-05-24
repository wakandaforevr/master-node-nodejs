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
import * as eth_manager from '../eth/eth';

var keyethereum = require('keyethereum');

export const transferAmount = (from_addr,
to_addr,
amount,
unit,
keystore,
password,
private_key,
(err, res) => {
  if (!private_key) {
    private_key = eth_manager.getPrivateKey(keystore, password, (err, res) => {
      if (err) throw err;
      else {
        return res;
      }
    });
  }
});

export const getDueAmount = (account_addr,
(err, res) => {
  due_amount = vpn_service_manager.getDueAmount(account_addr, (err, res) => {
    if (err) throw err;
    else {
      return res;
    }
  });
});

// export const addVpnUsage = (from_addr, to_addr, sent_bytes, session_duration, amount, timestamp, keystore, password, private_key,
// async.waterfall([
//   (next) => {
//   if(!private_key){
//     private_key = eth_manager.getPrivateKey(keystore,password,
//     (err,res) => {
//       if (err) next(err,null)
//       else res.send()

//       }
//     })

//   }
// }
// )
