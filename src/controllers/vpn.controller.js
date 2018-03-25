import async from 'async';
import request from 'request';
import uuid from 'uuid'

import * as VpnManager from '../eth/vpn_contract'
import * as EthHelper from '../helpers/eth';
import { dbs } from '../db/db';
import { SENT_BALANCE, VPNSERVICE_ADDRESS, DECIMALS } from '../utils/config';

export const getVpnsList = (req, res) => {
  dbs((err, dbo) => {
    let db = dbo.db('mydb');
    db.collection('nodes').find(
      { 'vpn.status': 'up' }).project({
        '_id': 0,
        'account.addr': 1,
        'location': 1,
        'netSpeed.upload': 1,
        'netSpeed.download': 1
      }).toArray((err, list) => {
        if (err) res.send(err);
        else res.send({
          'success': true,
          'list': list
        });
      })
  })
}

export const getCurrentVpnUsage = (req, res) => {
  let accountAddr = req.body['accountAddr']
  let sessionName = req.body['sessionName']

  dbs((err, dbo) => {
    let db = dbo.db('mydb')
    db.collection('connections').findOne({
      clientAddr: accountAddr,
      sessionName: sessionName
    }, {
        _id: 0,
        usage: 1
      }, (err, result) => {
        if (!result) res.send({})
        else res.send(result.usage)
      })
  })
}

export const getVpnCredentials = (req, res) => {
  let accountAddr = req.body['accountAddr'];
  let vpnAddr = req.body['vpnAddr'];
  let vpnAddrLen = vpnAddr.length;
  let db = null;

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next({
          message: 'database error',
          err: err
        }, null)
        db = dbo.db('mydb');
        next();
      })
    }, (next) => {
      EthHelper.getBalances(accountAddr,
        (err, balances) => {
          if (err) next(err, null);
          else next(null, balances);
        })
    }, (balances, next) => {
      if (balances.test.sents >= 100) {
        EthHelper.getDueAmount(accountAddr, (err, dueAmount) => {
          if (err) {
            next({
              'success': false,
              'error': err,
              'message': 'Error occurred while checking the due amount.'
            }, null)
          } else if (dueAmount == 0) {
            if (vpnAddrLen > 0) {
              db.collection('nodes').findOne(
                { 'accountAddr': vpnAddr, 'vpn.status': 'up' },
                { '_id': 0, 'token': 0 },
                (err, node) => {
                  if (err) next(err, null);
                  else next(null, node);
                })
            } else {
              db.collection('nodes').findOne(
                { 'vpn.status': 'up' },
                { '_id': 0, 'token': 0 },
                (err, node) => {
                  if (err) next(err, null);
                  else next(null, node);
                })
            }
          } else {
            next({
              'success': false,
              'message': 'You have due amount: ' +
                dueAmount / (DECIMALS * 1.0) + ' SENTs. Please try after clearing the due.'
            }, null)
          }
        });
      } else {
        next({
          'success': false,
          'message': 'Your balance is less than 100 SENTs.'
        }, null)
      }
    }, (node, next) => {
      if (!node) {
        if (vpnAddrLen) {
          next({
            'success': false,
            'message': 'VPN server is already occupied. Please try after sometime.'
          }, null)
        } else {
          next({
            'success': false,
            'message': 'All VPN servers are occupied. Please try after sometime.'
          }, null)
        }
      } else {
        next(null, node);
      }
    }, (node, next) => {
      EthHelper.getInitialPayment(accountAddr, (err, isPayed) => {
        if (err) {
          next({
            'success': false,
            'message': 'Error occurred while cheking initial payment status.'
          }, null)
        } else if (isPayed) {
          try {
            let token = uuid.v4();
            let ip = node.ip;
            let port = 3000;
            let body = {
              accountAddr: accountAddr,
              token: token
            };
            let url = 'http://' + ip + ':' + port + '/master/sendToken';
            request.post({ url: url, body: JSON.stringify(body) }, (err, r, resp) => {
              next(null, {
                'success': true,
                'ip': ip,
                'port': port,
                'token': token
              });
            })
          } catch (error) {
            next({
              'success': false,
              'message': 'Connection timed out while connecting to VPN server.',
              'error': error
            }, null);
          }
        } else {
          next({
            'success': false,
            'accountAddr': vpnAddr,
            'message': 'Initial payment status is empty.'
          }, null)
        }
      })
    }
  ], (err, resp) => {
    if (err)
      res.send(err);
    else
      res.send(resp);
  })
}

export const payVpnUsage = (req, res) => {
  let fromAddr = req.body['fromAddr']
  let amount = req.body['amount'] || null
  let sessionId = req.body['sessionId'] || null
  let net = req.body['net']
  let txData = req.body['txData']
  let paymentType = req.body['paymentType']

  sessionId = parseInt(sessionId)
  amount = parseInt(amount * (DECIMALS * 1.0))

  EthHelper.payVpnSession(fromAddr, amount, sessionId, net, txData, paymentType, (errors, txHashes) => {
    if (errors.length > 0) {
      res.send({
        'success': false,
        'errors': errors,
        'txHashes': txHashes,
        'message': 'Error occurred while paying VPN usage.'
      })
    } else {
      res.send({
        'success': true,
        'errors': errors,
        'txHashes': txHashes,
        'message': 'VPN payment is completed successfully.'
      })
    }
  })
}

export const reportPayment = (req, res) => {
  let fromAddr = req.body['from_addr']
  let amount = parseInt(req.body['amount'])
  let sessionId = parseInt(req.body['session_id'])

  VpnManager.payVpnSession(fromAddr, amount, sessionId, (error, txHash) => {
    if (!error) {
      res.status(200).send({
        'success': true,
        'tx_hash': txHash,
        'message': 'Payment Done Successfully.'
      })
    } else {
      res.status = 400
      res.send({
        'success': false,
        'error': error,
        'message': 'Vpn payment not successful.'
      })
    }
  })
}

export const getVpnUsage = (req, res) => {
  let accountAddress = req.body['accountAddr'];

  EthHelper.getVpnUsage(accountAddress, (err, usage) => {
    if (!err) {
      res.send({
        'success': true,
        'usage': usage
      })
    } else {
      res.send({
        'success': false,
        'error': err,
        'message': 'Error occured while fetching the usage data.'
      })
    }
  });
}
