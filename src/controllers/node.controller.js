import async from 'async';
import uuid from 'uuid';
import dateTime from 'date-time'

import { dbs } from '../db/db';
import * as EthHelper from '../helpers/eth'

import { DECIMALS } from '../utils/config'

global.db = null;

dbs((err, dbo) => {
  global.db = dbo.db('mydb')
})

/**
* @api {post} /node/register VPN registration.
* @apiName RegisterNode
* @apiGroup NODE
* @apiParam {String} accountAddr Account address.
* @apiParam {String} ip Internet Protocal of the VPN node.
* @apiParam {String} location location of the VPN node.
* @apiParam {String} netSpeed Net Speed of the VPN node.
* @apiParam {String} vpn status of the VPN node.
* @apiSuccess {String} token Token id for the node.
* @apiSuccess {String} message Node registered successfully.
*/

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

/**
* @api {post} /node/update-nodeinfo Update the existing node info.
* @apiName UpdateNodeInfo
* @apiGroup NODE
* @apiParam {String} token Token Id of Node.
* @apiParam {String} accountAddr Account address.
* @apiParam {String} info Info to be updated.
* @apiSuccess {String} message Node info updated successfully.
*/

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

/**
* @api {post} /node/update-connections Update the connections of VPNs.
* @apiName UpdateConnections
* @apiGroup NODE
* @apiParam {String} token Token Id of Node.
* @apiParam {String} accountAddr Account address.
* @apiParam {String[]} connections connected nodes list
* @apiSuccess {String} message Connection details updated successfully.
*/

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

/**
* @api {post} /node/deregister Deregistering the node.
* @apiName DeRegisterNode
* @apiGroup NODE
* @apiParam {String} accountAddr Account address to be deregistered.
* @apiParam {String} token Token Id of Node.
* @apiSuccess {String} message Node deregistred successfully.
*/

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

/**
* @api {post} /node/add-usage add the usage of the VPN.
* @apiName AddVpnUsage
* @apiGroup NODE
* @apiParam {String} fromAddr Account address which is used the VPN.
* @apiParam {String} toAddr Account address whose VPN is.
* @apiParam {Number} sentBytes Bytes used by the client.
* @apiParam {Number} sessionDuration Duration of the VPN connection.
* @apiParam {String} txHash Hash of the transaction.
* @apiSuccess {String} message VPN usage data will be added soon.
*/

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

//---------------------------------------------------------------------------------------

export const getDailySessionCount = (req, res) => {
  let dailyCount = []
  global.db.collection('connections').aggregate([{
    "$project": {
      "total": {
        "$add": [
          dateTime(1970, 0, 1), {
            "$multiply": ["$start_time", 1000]
          }
        ]
      }
    }
  }, {
    "$group": {
      "_id": {
        "$dateToString": {
          "format": "%d/%m/%Y",
          "date": '$total'
        }
      },
      "sessionsCount": {
        "$sum": 1
      }
    }
  }, {
    "$sort": {
      "_id": 1
    }
  }], (err, result) => {
    result.map((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    });
  })
}

export const getActiveSessionCount = (req, res) => {
  global.db.collection('connections').find({ endTime: null }).toArray((err, data) => {
    let count = data.length
    if (err) res.send(err)
    res.status = 200
    res.send({
      'success': true,
      'count': count
    })
  })
}

export const getDailyNodeCount = (req, res) => {
  let dailyCount = []
  global.db.collection('nodes').aggregate([{
    "$project": {
      "total": {
        "$add": [
          dateTime(1970, 0, 1), {
            "$multiply": ["$created_at", 1000]
          }
        ]
      }
    }
  }, {
    "$group": {
      "_id": {
        "$dateToString": {
          "format": "%d/%m/%Y",
          "date": '$total'
        }
      },
      "nodesCount": {
        "$sum": 1
      }
    }
  }, {
    "$sort": {
      "_id": 1
    }
  }], (err, result) => {
    result.map((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    })
  })
}

export const getActiveNodeCount = (req, res) => {
  global.db.collection('nodes').find({ "vpn.status": "up" }).toArray((err, data) => {
    let count = data.length
    if (err) res.send(err)
    res.status = 200
    res.send({
      'success': true,
      'count': count
    })
  })
}

export const getDailyDataCount = (req, res) => {
  let dailyCount = []
  async.waterfall([
    (next) => {
      global.db.collection('connections').find(
        { "usage": { "$exists": true } },
        (err, output) => {
          if (err)
            next({ message: 'database error' }, null)
          output.map((data) => {
            data['usage']['up'] = int(data['usage']['up'])
            data['usage']['down'] = int(data['usage']['down'])
            global.db.collection('connections').save(data)
          })
          next();
        })
    }, (next) => {
      global.db.collection('connections').aggregate([{
        "$project": {
          "total": {
            "$add": [
              dateTime(1970, 0, 1), {
                "$multiply": ["$start_time", 1000]
              }
            ]
          },
          "data": "$usage.down"
        }
      }, {
        "$group": {
          "_id": {
            "$dateToString": {
              "format": "%d/%m/%Y",
              "date": '$total'
            }
          },
          "dataCount": {
            "$sum": "$data"
          }
        }
      }, {
        "$sort": {
          "_id": 1
        }
      }], (err, result) => {
        result.map((doc) => {
          dailyCount.push(doc)
        })
        next()
      })
    }
  ], (err, resp) => {
    if (err) res.send(err);
    else
      res.send({
        'success': true,
        'stats': dailyCount
      });
  })
}

export const getTotalDataCount = (req, res) => {
  let totalCount = []
  global.db.collection('connections').aggregate([{
    "$group": {
      "_id": null,
      "Total": { "$sum": "$usage.down" }
    }
  }], (err, result) => {
    if (err) res.send(err)
    result.map((doc) => {
      totalCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': totalCount
    })
  })
}

export const getDailyDurationCount = (req, res) => {
  let dailyCount = []
  global.db.collection('connections').aggregate([{
    "$project": {
      "total": {
        "$add": [
          dateTime(1970, 1, 1), {
            "$multiply": ["$start_time", 1000]
          }
        ]
      },
      "start": "$start_time",
      "end": {
        "$cond": [{
          "$eq": ["$end_time", null]
        },
        parseInt(Date.now()), "$end_time"]
      }
    }
  }, {
    "$group": {
      "_id": {
        "$dateToString": {
          "format": "%d/%m/%Y",
          "date": '$total'
        }
      },
      "durationCount": {
        "$sum": {
          "$subtract": ["$end", "$start"]
        }
      }
    }
  }, {
    "$sort": {
      "_id": 1
    }
  }], (err, result) => {
    result.map((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    })
  })
}

export const getAverageDuration = (req, res) => {
  let avgCount = []
  global.db.collection('connections').aggregate([{
    "$project": {
      "Sum": {
        "$sum": {
          "$subtract": [{
            "$cond": [{
              "$eq": ["$end_time", null]
            },
            parseInt(Date.now()), "$end_time"]
          }, "$start_time"]
        }
      }
    }
  }, {
    "$group": {
      "_id": null,
      "Average": {
        "$avg": "$Sum"
      }
    }
  }], (err, result) => {
    if (err) res.send(err);
    result.map((doc) => {
      avgCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': avgCount
    })
  })
}