import async from 'async';
import uuid from 'uuid';
import { dbs } from '../db/db';
import * as eth_helper from '../helpers/eth'

import { DECIMALS } from '../utils/config'

export const registerNode = (req, res) => {
  let account_addr = req.body['account_addr']
  let ip = req.body['ip']
  let location = req.body['location']
  let net_speed = req.body['net_speed']
  let vpn = req.body['vpn']
  let token = uuid.v4();

  let db = null

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        db = dbo.db('mydb');
        next();
      })
    }, (next => {
      db.collection('nodes').findOne({ account_addr: account_addr }, (err, node) => {
        if (!node) next()
        else next({
          'success': false,
          'message': 'Error occurred while registering the node.'
        }, null)
      })
    }), (next) => {
      db.collection('nodes').insertOne({
        'account_addr': account_addr,
        'token': token,
        'location': location,
        'ip': ip,
        'net_speed': net_speed
      }, (err, resp) => {
        if (err) {
          next({
            'success': false,
            'message': 'Error occurred while registering the node.'
          }, null)
        }
        else if (resp.ops[0]._id) {
          next(null, {
            'success': true,
            'token': token,
            'message': 'Node registered successfully.'
          });
        }
      })

    }
  ], (err, result) => {
    if (err) res.send(err);
    else res.send(result);
  })
}

export const updateNodeInfo = (req, res) => {
  let token = req.body['token'];
  let account_addr = req.body['account_addr'];
  let info = req.body['info'];

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        let db = dbo.db('mydb');
        next(null, db)
      })
    }, (db, next) => {
      if (info['type'] == 'location') {
        let location = info['location'];

        db.collection('nodes').findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          { '$set': { 'location': location } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'net_speed') {
        let net_speed = info['net_speed'];

        db.nodes.findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          { '$set': { 'net_speed': net_speed } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'vpn') {
        let init_time = parseInt(Date.now() / 1000)

        db.nodes.findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.init_time': init_time,
              'vpn.last_ping': init_time
            }
          },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'alive') {
        let last_ping = parseInt(Date.now() / 1000)

        db.nodes.findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.last_ping': init_time
            }
          },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      }
    }
  ], (err, node) => {
    if (err) {
      res.send({
        err: err
      })
    }
    if (!node) {
      res.send({
        'success': false,
        'message': 'Node is not registered.'
      })
    } else {
      res.send({
        'success': true,
        'message': 'Node info updated successfully.'
      });
    }
  })
}

export const UpdateConnections = (req, res) => {
  let token = req.body['token']
  let account_addr = req.body['account_addr']
  let connections = req.body['connections']
  let db = null

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        db = dbo.db('mydb')
        next()
      })
    }, (next) => {
      db.collection('nodes').findOne({
        account_addr: account_addr,
        token: token
      }, (err, node) => {
        if (err) next(err, null)
        next(null, node)
      })
    }, (node, next) => {
      if (node) {
        let tx_hashes = []
        let errors = []
        async.eachSeries(connections, (info, iterate) => {
          info['account_addr'] = account_addr
          db.collection('connections').findOne({
            'account_addr': account_addr,
            'session_name': info['session_name']
          }, (err, connection) => {
            if (!connection) {
              db.collection('connections').insertOne(info)
            } else {
              db.collection('connections').findOneAndUpdate({
                'account_addr': account_addr,
                'session_name': info['session_name']
              }, {
                  $set: {
                    'usage': info['usage'],
                    'end_time': (typeof (info['usage']) != 'undefined') ? info['usage'] : null
                  }
                })
              if (typeof (info['end_time']) != 'undefined' && !info['end_time']) {
                let from_addr = account_addr
                let to_addr = connection['client_addr']
                let sent_bytes = parseInt(info['usage']['down'])
                let session_duration = parseInt(info['end_time']) - parseInt(connection['start_time'])
                let amount = (sent_bytes / (1024 * 1024 * 1024.0)) * 100.0
                let timestamp = Date.now() / 1000

                if (sent_bytes >= 100 * 1024 * 1024) {
                  eth_helper.addvpnusage(from_addr, to_addr, sent_bytes, session_duration, amount, timestamp, (err, tx_hash) => {
                    if (err) errors.push(err)
                    else tx_hashes.push(tx_hash)
                    iterate()
                  })
                }
              }
            }
          })
        }, () => {
          next(null, {
            'success': true,
            'message': 'Connection details updated successfully.',
            'tx_hashes': tx_hashes,
            'errors': errors
          })
        })
      } else {
        next({
          'success': false,
          'message': 'Can\'t find node with given details.'
        }, null)
      }
    }
  ], (err, resp) => {
    if (err) res.send(err)
    else res.send(resp)
  })
}

export const deRegisterNode = (req, res) => {
  let account_addr = req.body['account_addr'];
  let token = req.body['token'];

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        let db = dbo.db('mydb');
        next(null, db);
      })
    }, (db, next) => {
      db.collection('nodes').findOneAndDelete(
        { 'account.addr': account_addr, 'token': token },
        (err, node) => {
          if (!node.value) {
            next({
              'success': false,
              'message': 'Node is not registered.'
            }, null);
          } else {
            next(null, {
              'success': true,
              'message': 'Node deregistred successfully.'
            })
          }
        }
      )
    }
  ], (err, resp) => {
    if (err) res.send(err);
    else res.send(resp);
  })
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
  let to_addr = req.body['to_addr']
  let sent_bytes = parseInt(req.body['sent_bytes'])
  let session_duration = parseInt(req.body['session_duration'])
  let amount = parseInt((sent_bytes / (1024.0 * 1024.0 * 1024.0)) * 100.0 * DECIMALS)
  let timestamp = parseInt(Date.now() / 1000)

  if (sent_bytes <= 100 * 1024 * 1024) {
    res.send({
      'success': false,
      'error': 'Usage is less than 100 MB. So data is not added',
      'message': 'Usage is less than 100 MB. So data is not added'
    })
  }

  eth_helper.addvpnusage(
    from_addr, to_addr, sent_bytes, session_duration, amount, timestamp,
    (err, tx_hash) => {
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
}
