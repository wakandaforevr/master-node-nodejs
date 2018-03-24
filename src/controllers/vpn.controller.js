import async from 'async';
import request from 'request';
import uuid from 'uuid'

import * as vpn_manager from '../eth/vpn_contract'
import * as eth_helper from '../helpers/eth';
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
        'net_speed.upload': 1,
        'net_speed.download': 1
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
  let account_addr = req.body['account_addr']
  let session_name = req.body['session_name']

  dbs((err, dbo) => {
    let db = dbo.db('mydb')
    db.collection('connections').findOne({
      client_addr: account_addr,
      session_name: session_name
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
  let account_addr = req.body['account_addr'];
  let vpn_addr = req.body['vpn_addr'];
  let vpn_addr_len = vpn_addr.length;
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
      eth_helper.getbalances(account_addr,
        (err, balances) => {
          if (err) next(err, null);
          else next(null, balances);
        })
    }, (balances, next) => {
      if (balances.test.sents >= 100) {
        eth_helper.getdueamount(account_addr, (err, due_amount) => {
          if (err) {
            next({
              'success': false,
              'error': err,
              'message': 'Error occurred while checking the due amount.'
            }, null)
          } else if (due_amount == 0) {
            if (vpn_addr_len > 0) {
              db.collection('nodes').findOne(
                { 'account.addr': vpn_addr, 'vpn.status': 'up' },
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
                due_amount / (DECIMALS * 1.0) + ' SENTs. Please try after clearing the due.'
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
        if (vpn_addr_len) {
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
      eth_helper.getinitialpayment(account_addr, (err, is_payed) => {
        if (err) {
          next({
            'success': false,
            'message': 'Error occurred while cheking initial payment status.'
          }, null)
        } else if (is_payed) {
          try {
            let token = uuid.v4();
            let ip = node.ip;
            let port = 3000;
            let body = {
              account_addr: account_addr,
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
            'account_addr': vpn_addr,
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
  let from_addr = req.body['from_addr']
  let amount = (typeof req.body['amount'] != 'undefined' && !req.body['amount']) ? req.body['amount'] : null
  let session_id = (typeof req.body['session_id'] != 'undefined' && !req.body['session_id']) ? req.body['session_id'] : null
  let net = req.body['net']
  let tx_data = req.body['tx_data']
  let payment_type = req.body['payment_type']

  session_id = parseInt(session_id)
  amount = parseInt(amount * (DECIMALS * 1.0))
  console.log('in controller')

  eth_helper.payvpnsession(from_addr, amount, session_id, net, tx_data, payment_type, (errors, tx_hashes) => {
    if (errors.length > 0) {
      res.send({
        'success': false,
        'errors': errors,
        'tx_hashes': tx_hashes,
        'message': 'Error occurred while paying VPN usage.'
      })
    } else {
      res.send({
        'success': true,
        'errors': errors,
        'tx_hashes': tx_hashes,
        'message': 'VPN payment is completed successfully.'
      })
    }
  })
}

export const ReportPayment = (req, res) => {
  let from_addr = req.body['from_addr']
  let amount = parseInt(req.body['amount'])
  let session_id = parseInt(req.body['session_id'])

  vpn_manager.payvpnsession(from_addr, amount, session_id, (error, tx_hash) => {
    if (!error) {
      res.status(200).send({
        'success': true,
        'tx_hash': tx_hash,
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
  let account_address = req.body['account_addr'];
  eth_helper.getvpnusage(account_address, (err, usage) => {
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

export const PutClientConnection = (req, res) => {
  let server_addr = req.body['vpn_addr'];
  let client_addr = req.body['account_addr'];
  dbs((err, dbo) => {
    let db = dbo.db('mydb');
    db.collection('connection').findOne({ 'server_addr': server_addr }, (err, resp) => {
      console.log('resp :', resp)
      if (!resp) {
        db.collection('connection').insertOne({
          'server_addr': server_addr,
          'client_addr': client_addr
        }, (err, resp) => {
          if (err) res.send(err);
          else res.send({ 'success': true });
        })
      } else {
        db.collection('connection').findOneAndUpdate(
          { 'server_addr': server_addr },
          { '$set': { 'client_addr': client_addr } },
          (err, resp) => {
            if (err) res.send(err);
            else res.send({ 'success': true });
          })
      }
    });
  })
}