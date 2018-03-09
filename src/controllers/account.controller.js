import async from 'async';

import * as eth_manager from '../eth/eth';


export const createAccount = (req, res) => {
  let password = req.body['password'];

  async.waterfall([
    (next) => {
      eth_manager.createAccount(password,
        (err, accountDetails) => {
          if (err) next(err, null)
          else next(null, accountDetails);
        });
    }
  ], (err, result) => {
    let message = {
      'success': false,
      'error': err,
      'message': 'Error occurred while create wallet. Please try again.'
    };
    if (!err) {
      message = {
        'success': true,
        'account_addr': result.wallet_address,
        'private_key': result.private_key,
        'keystore': result.keystore_data,
        'message': 'Account created successfully. Please store the Private key and Keystore data safely.'
      };
    }
    res.status = 200;
    res.send(message);
  });
}

export const getBalance = (req, res) => {
  let wallet_address = req.body['wallet_address'];

  async.waterfall([
    (next) => {
      eth_manager.getBalance(wallet_address,
        (err, result) => {
          if (err) next(err, null);
          else next(null, result);
        });
    }
  ], (err, result) => {
    if (err) res.send(err);
    else res.send({
      'balance': result
    });
  })
}