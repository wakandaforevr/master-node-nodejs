import async from 'async';
import request from 'request';
import { dbs } from '../db/db'
import { SENT_BALANCE, VPNSERVICE_ADDRESS, DECIMALS } from '../utils/config'

import * as eth_manager from '../eth/eth';

export const getVpnCredentials = (req, res) => {
  let account_addr = req.body['account_addr'];
  let vpn_address = req.body['vpn_address'];
  let url = SENT_BALANCE + account_addr;

  async.waterfall([
    (next) => {
      request.get({ url: url, json: true },
        (err, r, result) => {
          if (err)
            next({
              'success': false,
              'message': 'Error while checking your balance'
            }, null);
          else
            next(null, result);
        })
    }, (result_data, next) => {
      let result = parseInt(result_data.result);
      result = result / Math.pow(10, 8);

      if (result >= 100) {
        eth_manager.getDueAmount(account_addr,
          (err, due) => {
            if (err) {
              next({
                'success': false,
                'error': err,
                'message': 'Error occurred while checking the due amount.'
              }, null)
            } else if (due == 0) {
              let vpn_address_len = vpn_address.length;
              if (vpn_address_len > 0) {
                dbs((err, dbo) => {
                  if (err) {
                    next(err, null)
                  } else {
                    let db = dbo.db('mydb');
                    db.collection('nodes').findOne(
                      { 'account.addr': vpn_address, 'vpn.status': 'up' },
                      { '_id': 0, 'token': 0 },
                      (err, node) => {
                        dbo.close();
                        if (err) next(err, null);
                        else next(null, node);
                      })
                  }
                })
              } else {
                dbs((err, db) => {
                  if (err) {
                    next(err, null)
                  } else {
                    db.collection('nodes').findOne(
                      { 'vpn.status': 'up' },
                      { '_id': 0, 'token': 0 }
                    ), (err, node) => {
                      dbo.close();
                      if (err) next(err, null);
                      else next(null, node);
                    }
                  }
                })
              }
            } else {
              next({
                'success': false,
                'message': 'You have due amount: ' + (due / (1.0 * DECIMALS)) + ' SENTs.' + ' Please try after clearing the due.'
              }, null)
            }
          })
      } else {
        next({
          'success': false,
          'message': 'Your balance is less than 100 sents'
        }, null);
      }
    }, (node, next) => {
      if (!node) {
        if (vpn_address > 0)
          next({
            'success': false,
            'message': 'VPN server is already occupied. Please try after sometime.'
          }, null);
        else
          next({
            'success': false,
            'message': 'All VPN servers are occupied. Please try after sometime.'
          }, null);
      } else {
        let secretToken = 'hello';
        let node_address = node.ip;
        let message = {
          'success': true,
          'ip': node_address,
          'port': 3000,
          'token': secretToken
        }
        let body = {
          'account_addr': account_addr,
          'token': secretToken
        }
        let url = "http://" + node_address + ":8333/master/sendToken"
        request.post({ url: url, body: JSON.stringify(body) }, (err, r, res) => {
          next(null, message);
        })
      }
    }], (err, result) => {
      if (err)
        res.send(err);
      else
        res.send(result);
    })
}

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
        db.findOneAndUpdate(
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

export const getVpnUsage = (req, res) => {
  let account_address = req.body['account_addr'];
  eth_manager.getVpnUsage(account_address, (err, usage) => {
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

const get_client_address = (account_addr, cb) => {
  dbs((err, dbo) => {
    let db = dbo.db('mydb');
    db.collection('connection').findOne({ 'server_addr': account_addr }, (err, _connection) => {
      dbo.close();
      cb(_connection['client_addr']);
    });
  })
}

export const addVpnUsage = (req, res) => {
  let from_addr = req.body['from_addr']
  let sent_bytes = parseInt(req.body['sent_bytes'])
  let session_duration = parseInt(req.body['session_duration'])
  let amount = parseInt((sent_bytes / (1024.0 * 1024.0 * 1024.0)) * 100.0 * DECIMALS)
  let timestamp = parseInt((new Date().getTime()) / 1000);

  if (sent_bytes < (10 * 1024 * 1024)) {
    res.send({
      'success': false,
      'error': 'Usage is less than 10 MB. So data is not added',
      'message': 'Usage is less than 10 MB. So data is not added'
    })
  }
  let to_addr = get_client_address(from_addr, (to_addr) => {
    eth_manager.addVpnUsage(
      from_addr, to_addr, sent_bytes, session_duration, amount, timestamp
      , (err, tx_hash) => {
        if (!err) {
          res.send({
            'success': true,
            'tx_hash': tx_hash,
            'message': 'VPN usage data will be added soon.'
          })
        } else {
          res.send({
            'success': false,
            'error': err,
            'message': 'Error occurred while adding the VPN usage data.'
          })
        }
      })
  })
}

export const payVpnUsage = (req, res) => {
  let from_addr = req.body['from_addr']
  let amount = req.body['amount']
  let session_id = parseInt(req.body['session_id'])
  let tx_data = req.body['tx_data']
  amount = parseInt(amount * (DECIMALS * 1.0))
  eth_manager.payVpnUsage(from_addr, amount, session_id, tx_data, (errors, tx_hashes) => {
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