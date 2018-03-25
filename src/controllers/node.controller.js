import async from 'async';
import uuid from 'uuid';
import { dbs } from '../db/db';
import * as EthHelper from '../helpers/eth'

import { DECIMALS } from '../utils/config'

export const registerNode = (req, res) => {
  let accountAddr = req.body['accountAddr']
  let ip = req.body['ip']
  let location = req.body['location']
  let netSpeed = req.body['netSpeed']
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
      db.collection('nodes').findOne({ accountAddr: accountAddr }, (err, node) => {
        if (!node) next()
        else next({
          'success': false,
          'message': 'Error occurred while registering the node.'
        }, null)
      })
    }), (next) => {
      db.collection('nodes').insertOne({
        'accountAddr': accountAddr,
        'token': token,
        'location': location,
        'ip': ip,
        'netSpeed': netSpeed
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
  let accountAddr = req.body['accountAddr'];
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
          { 'accountAddr': accountAddr, 'token': token },
          { '$set': { 'location': location } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'netSpeed') {
        let netSpeed = info['netSpeed'];

        db.collection('nodes').findOneAndUpdate(
          { 'accountAddr': accountAddr, 'token': token },
          { '$set': { 'netSpeed': netSpeed } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'vpn') {
        let initTime = parseInt(Date.now() / 1000)

        db.collection('nodes').findOneAndUpdate(
          { 'accountAddr': accountAddr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.initTime': initTime,
              'vpn.lastPing': initTime
            }
          },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'alive') {
        let lastPing = parseInt(Date.now() / 1000)

        db.collection('nodes').findOneAndUpdate(
          { 'accountAddr': accountAddr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.lastPing': lastPing
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

export const updateConnections = (req, res) => {
  let token = req.body['token']
  let accountAddr = req.body['accountAddr']
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
        accountAddr: accountAddr,
        token: token
      }, (err, node) => {
        if (err) next(err, null)
        next(null, node)
      })
    }, (node, next) => {
      if (node) {
        let txHashes = []
        let errors = []
        async.eachSeries(connections, (info, iterate) => {
          setTimeout(() => {
            info['accountAddr'] = accountAddr
            db.collection('connections').findOne({
              'accountAddr': accountAddr,
              'sessionName': info['sessionName']
            }, (err, connection) => {
              if (!connection) {
                db.collection('connections').insertOne(info)
              } else {
                db.collection('connections').findOneAndUpdate({
                  'accountAddr': accountAddr,
                  'sessionName': info['sessionName']
                }, {
                    $set: {
                      'usage': info['usage'],
                      'endTime': info['usage'] || null //(typeof (info['usage']) != 'undefined') ? info['usage'] : null
                    }
                  })
                if (typeof (info['endTime']) != 'undefined' && !info['endTime']) {
                  let fromAddr = accountAddr
                  let toAddr = connection['clientAddr']
                  let sentBytes = parseInt(info['usage']['down'])
                  let sessionDuration = parseInt(info['endTime']) - parseInt(connection['startTime'])
                  let amount = (sentBytes / (1024 * 1024 * 1024.0)) * 100.0
                  let timeStamp = Date.now() / 1000

                  if (sentBytes >= 100 * 1024 * 1024) {
                    EthHelper.addVpnUsage(fromAddr, toAddr, sentBytes, sessionDuration, amount, timeStamp, (err, tx_hash) => {
                      if (err) errors.push(err)
                      else txHashes.push(tx_hash)
                      iterate()
                    })
                  }
                }
              }
            })
          }, 0)
        }, () => {
          next(null, {
            'success': true,
            'message': 'Connection details updated successfully.',
            'txHashes': txHashes,
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
  let accountAddr = req.body['accountAddr'];
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
        { 'accountAddr': accountAddr, 'token': token },
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
        })
    }
  ], (err, resp) => {
    if (err) res.send(err);
    else res.send(resp);
  })
}

export const addVpnUsage = (req, res) => {
  let fromAddr = req.body['fromAddr']
  let toAddr = req.body['toAddr']
  let sentBytes = parseInt(req.body['sentBytes'])
  let sessionDuration = parseInt(req.body['sessionDuration'])
  let amount = parseInt((sentBytes / (1024.0 * 1024.0 * 1024.0)) * 100.0 * DECIMALS)
  let timeStamp = parseInt(Date.now() / 1000)

  if (sentBytes <= 100 * 1024 * 1024) {
    res.send({
      'success': false,
      'error': 'Usage is less than 100 MB. So data is not added',
      'message': 'Usage is less than 100 MB. So data is not added'
    })
  }

  EthHelper.addVpnUsage(
    fromAddr, toAddr, sentBytes, sessionDuration, amount, timeStamp,
    (err, txHash) => {
      if (!err) {
        res.send({
          'success': true,
          'txHash': txHash,
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
