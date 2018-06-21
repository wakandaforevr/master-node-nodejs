import async from 'async'

import { TOKENS } from '../token_config'
import { tokens } from '../helpers/tokens'
import { CENTRAL_WALLET, DECIMALS, ADDRESS } from '../utils/config'
import * as ETHHelper from '../helpers/eth'

export const getAvailableTokens = (req, res) => {
  let dailyCount = [];
  let token = [];
  token = Object.assign([], TOKENS)

  async.eachSeries(token, (item, next) => {
    delete item.price_url
    next()
  }, () => {
    res.status = 200;
    res.send({
      'success': true,
      'tokens': token,
    })
  })
}

export const getSents = (req, res) => {
  let toAddr = req.query['to_addr'];
  toAddr = toAddr.toString();
  let value = req.query['value'];
  let token = tokens.getToken(toAddr);

  if (token) {
    tokens.calculateSents(token, value, (sents) => {
      res.send({
        'success': true,
        'sents': sents
      })
    })
  } else {
    res.send({
      'success': false,
      'message': 'No token found.'
    })
  }
}

export const tokenSwapRawTransaction = (req, res) => {

  let txData = req.body['tx_data'];
  let toAddr = req.query['account_addr'];
  let fromToken = tokens.getToken(req.body['from'])
  let toToken = tokens.getToken(req.body['to'])
  let value = 0 // parseInt(req.query['value']);
  // value = tokens.exchange(fromToken, toToken, value)
  // value = value * (1.0*(Math.pow(10, toToken['decimals'])))
  let balance = 1// ETHHelper.rawTransaction(txData, 'main')
  let requestedSents = 0;
  let availableSents = 1;

  console.log('req.body in token swaps', req.body, txData, toAddr, '--------------------------------------------------------------------------------------------');

  async.waterfall([
    (next) => {
      /* tokens.calculateSents(token, value, (reqSents) => {
        console.log('requested sents', reqSents)
        requestedSents = reqSents;
        next()
      }) */
      next()
    }, (next) => {
      /* ETHHelper.getBalances(CENTRAL_WALLET, (err, availSents) => {
        console.log('requested sents', availSents, err, '----------------------------------------------------------------------------')
        availableSents = availSents
        next()
      }) */
      next()
    }, (next) => {
      // if (availableSents['main']['sents'] >= (requestedSents * DECIMALS)) {
      if (balance >= value) {
        ETHHelper.rawTransaction(txData, 'main', (err, txHash) => {
          if (!err) {
            global.db.collection('swaps').insertOne({
              'from_symbol': fromToken['symbol'],
              'to symbol': toToken['symbol'],
              'from_address': ADDRESS,
              'to_address': toAddr,
              'tx_data': txData,
              'tx_hash_0': txHash,
              'time_0': parseInt(Date.now() / 1000),
              'status': 0
            }, (err, resp) => {
              if (err) next(err, null);
              else next(null, {
                'success': true,
                'txHash': txHash,
                'message': 'Transaction initiated successfully.'
              })
            })
          } else {
            next({
              'success': false,
              'error': err,
              'message': 'Error occurred while initiating the transaction.'
            }, null)
          }
        })
      } else {
        next({
          'success': false,
          'message': 'No enough coins in the Central wallet.'
        }, null)
      }
    }
  ], (err, resp) => {
    if (err) res.status(400).send(err);
    else res.status(200).send(resp)
  })
}

export const getExchangeValue = (req, res) => {
  let fromToken = tokens.getToken(req.query['from']);
  let toToken = tokens.getToken(req.query['to']);
  let value = parseFloat(req.query['value']);
  let message = {}

  if (!fromToken && !toToken) {
    message.success = false;
    message.message = 'From token OR To token is not found.'
    res.status(400).send(message)
  } else {
    tokens.exchange(fromToken, toToken, value, (value) => {
      message.success = true;
      message.value = value;
    })
    res.status(200).send(message)
  }
}

export const swapStatus = (req, res) => {
  let key = req.query['key'];
  let findObj = null;

  if (key.length == 66)
    findObj = { 'tx_hash_0': key }
  else if (key.length == 34)
    findObj = { 'from_address': key }

  global.db.collection('swaps').findOne({ findObj }, { _id: 0 }, (err, resp) => {
    let message = {}
    if (!result) {
      message = {
        'success': false,
        'message': 'No transaction found.'
      }
    } else {
      message = {
        'success': true,
        'result': result
      }
    }
    res.status(200).send(message)
  })
}

export const getNewAddress = () => {
  let toAddress = req.body['account_addr']
  let fromToken = tokens.getToken(req.body['from'])
  let toToken = tokens.getToken(req.body['to'])
  let message = {}

  BTCHelper.getNewAddress(fromToken['symbol'], (fromAddress) => {
    if (fromAddress) {
      global.db.collection('swaps').insertOne({
        'from_symbol': fromToken['symbol'],
        'to_symbol': toToken['symbol'],
        'from_address': fromAddress,
        'to_address': toAddress,
        'time_0': Date.now() / 1000,
        'status': 0
      }, (err, resp) => {
        message = {
          'success': true,
          'address': fromAddress
        }
      })
    } else {
      message = {
        'success': false,
        'message': `Error occurred while getting ${fromAddress['symbol']} address.`
      }
      res.status(200).send(message)
    }
  })
}