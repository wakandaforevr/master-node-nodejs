import async from 'async';
import * as EthHelper from '../helpers/eth';

/**
* @api {post} /client/account Create new account for the Sentinel user.
* @apiName CreateNewAccount
* @apiGroup Account
* @apiParam {String} password Password for creating the new account.
* @apiSuccess {String} account_addr New account address.
* @apiSuccess {String} private_key Private key of the account.
* @apiSuccess {String} keystore Keystore file data of the account.
*/

export const createAccount = (req, res) => {
  let password = req.body['password'];

  async.waterfall([
    (next) => {
      EthHelper.createAccount(password,
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
        'accountAddr': result.walletAddress,
        'privateKey': result.privateKey,
        'keyStore': result.keystoreData,
        'message': 'Account created successfully. Please store the Private key and Keystore data safely.'
      };
    }
    res.send(message);
  });
}

/** 
* @api {post} /client/account/balance Get account balances.
* @apiName GetBalance
* @apiGroup Account
* @apiParam {String} account_addr Address of the account.
* @apiSuccess {Object} balances Account balances.
*/

export const getBalance = (req, res) => {
  let accountAddr = req.body['accountAddr'];

  EthHelper.getBalances(accountAddr, (err, balances) => {
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