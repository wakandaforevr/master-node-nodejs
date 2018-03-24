import async from 'async';
import * as eth_helper from '../helpers/eth';
import * as sentinel_manager from '../eth/sentinel_contract'


export const createAccount = (req, res) => {
  let password = req.body['password'];

  async.waterfall([
    (next) => {
      eth_helper.createaccount(password,
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
      res.status = 200;
      message = {
        'success': true,
        'account_addr': result.wallet_address,
        'private_key': result.private_key,
        'keystore': result.keystore_data,
        'message': 'Account created successfully. Please store the Private key and Keystore data safely.'
      };
    }
    res.send(message);
  });
}

export const getBalance = (req, res) => {
  let account_addr = req.body['account_addr'];
  eth_helper.getbalances(account_addr, (err, balances) => {
    if (err) {
      res.send({
        success: false,
        message: 'error occured while checking balances'
      })
    } else {
      res.status(200).send({
        success: true,
        balances: balances
      })
    }
  })
}