import async from 'async';
import uuid from 'uuid';
import dateTime from 'date-time'
import { exec } from "child_process";

import { dbs } from '../db/db';
import * as EthHelper from '../helpers/eth'

import { DECIMALS } from '../utils/config'

const getLatency = (url, cb) => {
  const avgLatencyCmd = "ping -c 2 183.82.119.118 | tail -1 | awk '{print $4}' | cut -d '/' -f 2"
  exec(avgLatencyCmd, (error, stdout, stderr) => {
    if (error)
      return cb({ 'error': 'error getting in latency' }, null)
    return cb(null, stdout)
  })
}

const calculateAmount = (usedBytes, pricePerGB) => {
  return (usedBytes / (1024 * 1024 * 1024)) * pricePerGB;
}

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
  let accountAddr = req.body['account_addr']
  let pricePerGB = parseFloat(req.body['price_per_gb']) || parseFloat(req.body['price_per_GB'])
  let ip = req.body['ip']
  let location = req.body['location']
  let netSpeed = req.body['net_speed']
  let vpnType = req.body['vpn_type'] || null
  let token = uuid.v4();
  let db = null;
  let joinedOn = Date.now() / 1000;
  let latency = null;

  accountAddr = accountAddr.toString();
  pricePerGB = parseFloat(pricePerGB);
  ip = ip.toString();
  vpnType = vpnType.toString();


  async.waterfall([
    (next) => {
      getLatency(ip, (err, resp) => {
        if (err) next(err, null);
        latency = resp;
        next();
      })
    }, (next) => {
      global.db.collection('nodes').findOne({ "account_addr": accountAddr },
        (err, node) => {
          console.log('err, node', err, node)
          if (!err) {
            next(null, node)
          } else next({
            'succes': false,
            'message': 'Error occurred while registering node.'
          }, null)
        })
    }, (node, next) => {
      if (!node) {
        console.log('if')
        global.db.collection('nodes').insertOne({
          'account_addr': accountAddr,
          'token': token,
          'ip': ip,
          'price_per_gb': pricePerGB,
          'latency': latency,
          'vpn_type': vpnType,
          'joined_on': joinedOn,
          'location': location,
          'net_speed': netSpeed
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
      } else {
        console.log('else')
        global.db.collection('nodes').findOneAndUpdate({
          'account_addr': accountAddr
        }, {
            '$set': {
              'token': token,
              'ip': ip,
              'price_per_gb': pricePerGB,
              'latency': latency,
              'vpn_type': vpnType,
              'location': location,
              'net_speed': netSpeed
            }
          }, (err, resp) => {
            console.log('err, resp', err, resp)
            if (err) {
              next({
                'success': false,
                'message': 'node not registered successfully'
              }, null)
            } else {
              next(null, {
                'success': true,
                'token': token,
                'message': 'Node registered successfully.'
              })
            }
          })
      }
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
  let accountAddr = req.body['account_addr'];
  let info = req.body['info'];

  async.waterfall([
    (next) => {
      if (info['type'] == 'location') {
        let location = info['location'];

        global.db.collection('nodes').findOneAndUpdate(
          { 'account_addr': accountAddr, 'token': token },
          { '$set': { 'location': location } },
          (err, node) => {
            console.log('node', node.value);
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'net_speed') {
        let netSpeed = info['net_speed'];

        global.db.collection('nodes').findOneAndUpdate(
          { 'account_addr': accountAddr, 'token': token },
          { '$set': { 'net_speed': netSpeed } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'vpn') {
        let initOn = parseInt(Date.now() / 1000)

        global.db.collection('nodes').findOneAndUpdate(
          { 'account_addr': accountAddr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.init_on': initOn,
              'vpn.ping_on': initOn
            }
          },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'alive') {
        let pingOn = parseInt(Date.now() / 1000)

        global.db.collection('nodes').findOneAndUpdate(
          { 'account_addr': accountAddr, 'token': token },
          {
            '$set': {
              'vpn.status': 'up',
              'vpn.ping_on': pingOn
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
        success: false,
        err: 'Error in finding node'
      })
    }
    if (!node.value) {
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
  let accountAddr = req.body['account_addr']
  let connections = req.body['connections']
  let txHashes = []
  let sessionNames = []
  let cond = '$nin'
  let node = null

  async.waterfall([
    (next) => {
      global.db.collection('nodes').findOne({
        accountAddr: accountAddr,
        token: token
      }, (err, resp) => {
        if (err) next(err, null)
        node = resp
        next()
      })
    }, (next) => {
      if (node) {
        async.eachSeries(connections, (connection, iterate) => {
          connection['vpn_addr'] = accountAddr;
          let address = connection['account_addr'] || null;

          if (address) {
            connection['client_addr'] = address.toString();
            delete connection['account_addr'];
          }

          global.db.collection('connections').findOne({
            'vpn_addr': connection['vpn_addr'],
            'session_name': connection['session_name']
          }, (err, data) => {
            if (!data) {
              connection['start_time'] = Date.now() / 1000;
              connection['end_time'] = null;
              global.db.collection('connections').insertOne(connection)
            } else {
              global.db.collection('connections').findOneAndUpdate({
                'vpn_addr': connection['vpn_addr'],
                'session_name': connection['session_name'],
                'end_time': null
              }, {
                  $set: {
                    'server_usage': connection['usage']
                  }
                })

              sessionNames.push(connection['session_name'])
              let endTime = connection['end_time'] || null

              if (endTime)
                cond = '$in'
            }
          })
          iterate()
        }, () => {
          next()
        })
      } else {
        next({
          'success': false,
          'message': 'Can\'t find node with given details.'
        }, null)
      }
    }, (next) => {
      let endTime = parseInt(Date.now() / 1000)
      let endedConnections = [];

      global.db.collection('connections').updateMany({
        'vpn_addr': accountAddr,
        'session_name': {
          cond: sessionNames
        },
        'end_time': null
      }, {
          '$set': {
            'end_time': endTime
          }
        }, (err, resp) => {
          if (resp.modifiedCount > 0) {
            global.db.collection('connections').find({
              'vpn_addr': accountAddr,
              'session_name': {
                cond: sessionNames
              },
              'end_time': endTime
            }).toArray((err, resp) => {
              next(null, resp)
            })
          } else {
            next(null, endedConnections);
          }
        })
    }, (endedConnections, next) => {
      async.eachSeries(endedConnections, (connection, iterate) => {
        let toAddr = parseInt(connection['client_addr']);
        let sentBytes = parseInt(connection['server_usage']['down']);
        let sessionDuration = parseInt(connection['end_time']) - parseInt(connection['start_time']);
        let amount = parseInt(calculateAmount(sentBytes, node['price_per_gb']) * DECIMALS);
        let timeStamp = Date.now() / 1000;
        EthHelper.addVpnUsage(accountAddr, toAddr, sentBytes, sessionDuration, amount, timeStamp,
          (err, txHash) => {
            if (err) txHashes.push(err)
            else txHashes.push(txHash)
          })
        iterate()
      }, () => {
        next(null, {
          'success': true,
          'message': 'Connection details updated successfully.',
          'tx_hashes': txHashes
        })
      })
    }], (err, resp) => {
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
  let accountAddr = req.body['account_addr'];
  let token = req.body['token'];

  async.waterfall([
    (next) => {
      global.db.collection('nodes').findOneAndDelete(
        { 'account_addr': accountAddr, 'token': token },
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

export const getDailyDataCount = (req, res) => {
  let dailyCount = []
  async.waterfall([
    (next) => {
      global.db.collection('connections').aggregate([{
        "$project": {
          "total": {
            "$add": [
              new Date(1970 - 1 - 1), {
                "$multiply": ["$start_time", 1000]
              }
            ]
          },
          "data": "$server_usage.down"
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
      }]).toArray((err, result) => {
        result.map((doc) => {
          dailyCount.push(doc)
        })
        next(null, result)
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
      "Total": {
        "$sum": "$server_usage.down"
      }
    }
  }]).toArray((err, result) => {
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

export const getLastDataCount = (req, res) => {
  global.db.collection('connections').aggregate([
    { '$match': { 'start_time': { '$gte': (Date.now() / 1000) - (24 * 60 * 60) } } },
    {
      '$group': {
        '_id': null,
        'Total': {
          '$sum': '$server_usage.down'
        }
      }
    }]).toArray((err, resp) => {
      if (err) {
        res.send({
          'success': false,
          'err': err
        })
      } else {
        res.send({
          'success': true,
          'average': resp
        })
      }
    })
}

export const getDailyNodeCount = (req, res) => {
  let dailyCount = []

  global.db.collection('nodes').aggregate([{
    "$project": {
      "total": {
        "$add": [
          new Date(1970 - 1 - 1), {
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
  }]).toArray((err, result) => {
    result.map((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    })
  })
}

export const getTotalNodeCount = (req, res) => {
  global.db.collection('statistics').aggregate([{
    '$project': {
      'total': {
        '$add': [
          new Date(1970 - 1 - 1), {
            '$multiply': ['$timestamp', 1000]
          }
        ]
      },
      'nodes': '$nodes.total'
    }
  }, {
    '$group': {
      '_id': {
        '$dateToString': {
          'format': '%d/%m/%Y',
          'date': '$total'
        }
      },
      'nodesCount': {
        '$sum': '$nodes'
      }
    }
  }, {
    '$sort': {
      '_id': 1
    }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
  })
}

export const getDailyActiveNodeCount = (req, res) => {
  global.db.collection('statistics').aggregate([{
    '$project': {
      'total': {
        '$add': [
          new Date(1970 - 1 - 1), {
            '$multiply': ['$timestamp', 1000]
          }
        ]
      },
      'nodes': '$nodes.up'
    }
  }, {
    '$group': {
      '_id': {
        '$dateToString': {
          'format': '%d/%m/%Y',
          'date': '$total'
        }
      },
      'nodesCount': {
        '$sum': '$nodes'
      }
    }
  }, {
    '$sort': {
      '_id': 1
    }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
  })
}

export const getAverageNodesCount = (req, res) => {
  global.db.collection('nodes').aggregate([{
    '$group': {
      '_id': null,
      'olddate': {
        '$min': "$joined_on"
      },
      'newdate': {
        '$max': "$joined_on"
      },
      "SUM": {
        '$sum': 1
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'Average': {
        '$divide': [
          "$SUM", {
            '$divide': [{
              "$subtract": ["$newdate", "$olddate"]
            }, 24 * 60 * 60]
          }
        ]
      }
    }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
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

export const getDailySessionCount = (req, res) => {
  let dailyCount = []
  global.db.collection('connections').aggregate([{
    "$project": {
      "total": {
        "$add": [
          new Date(1970 - 1 - 1), {
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
          "date": "$total"
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
  }]).toArray((err, result) => {
    console.log('result', result)
    result.forEach((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    });
  })
}

export const getAverageSessionsCount = (req, res) => {
  global.db.collection('connections').aggregate([{
    '$group': {
      '_id': null,
      'olddate': {
        '$min': "$start_time"
      },
      'newdate': {
        '$max': "$start_time"
      },
      "SUM": {
        '$sum': 1
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'Average Sessions': {
        '$divide': [
          "$SUM", {
            '$divide': [{
              "$subtract": ["$newdate", "$olddate"]
            }, 24 * 60 * 60]
          }
        ]
      }
    }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
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

export const getDailyDurationCount = (req, res) => {
  let dailyCount = []
  global.db.collection('connections').aggregate([{
    "$project": {
      "total": {
        "$add": [
          new Date(1970 - 1 - 1), {
            "$multiply": ["$start_time", 1000]
          }
        ]
      },
      "start": "$start_time",
      "end": {
        "$cond": [{
          "$eq": ["$end_time", null]
        },
        parseInt(Date.now() / 1000), "$end_time"]
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
  }]).toArray((err, result) => {
    result.map((doc) => {
      dailyCount.push(doc)
    })
    res.send({
      'success': true,
      'stats': dailyCount
    })
  })
}

export const getDailyAverageDuration = (req, res) => {
  global.db.collection('connections').aggregate([{
    '$project': {
      'total': {
        '$add': [new Date(1970 - 1 - 1), {
          '$multiply': ['$start_time', 1000]
        }]
      }, 'Sum': {
        '$sum': {
          '$subtract': [
            {
              '$cond': [
                { '$eq': ['$end_time', null] },
                parseInt(Date.now() / 1000),
                '$end_time']
            },
            '$start_time'
          ]
        }
      }
    }
  }, {
    '$group': {
      '_id': { '$dateToString': { 'format': '%d/%m/%Y', 'date': '$total' } },
      'Average': { '$avg': '$Sum' }
    }
  }, {
    '$sort': { '_id': 1 }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
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
            parseInt(Date.now() / 1000), "$end_time"]
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
  }]).toArray((err, result) => {
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

export const getLastAverageDuration = (req, res) => {
  global.db.collection('connections').aggregate([
    { '$match': { 'start_time': { '$gte': Date.now() / 1000 - (24 * 60 * 60) } } },
    {
      '$project': {
        'Sum': {
          '$sum': {
            '$subtract': [{
              '$cond': [{
                '$eq': ['$end_time', null]
              },
              Date.now() / 1000, '$end_time']
            }, '$start_time']
          }
        }
      }
    }, {
      '$group': {
        '_id': null,
        'Average': {
          '$avg': '$Sum'
        }
      }
    }]).toArray((err, resp) => {
      if (err) {
        res.send({
          'success': false,
          'err': err
        })
      } else {
        res.send({
          'success': true,
          'average': resp
        })
      }
    })
}

export const getNodeStatistics = (req, res) => {
  let account_addr = req.query.addr;

  global.db.collection('connections').aggregate([{
    '$match': {
      'account_addr': account_addr
    }
  }, {
    '$group': {
      '_id': '$vpn_addr',
      'sessions_count': {
        '$sum': 1
      },
      'active_sessions': {
        '$sum': {
          '$cond': [{
            '$or': [{
              '$eq': ['$end_time', null]
            }, {
              '$eq': ['$end_time', null]
            }]
          }, 1, 0]
        }
      },
      'download': {
        '$sum': '$server_usage.down'
      },
      'upload': {
        '$sum': '$server_usage.up'
      }
    }
  }]).toArray((err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'err': err
      })
    } else {
      res.send({
        'success': true,
        'average': resp
      })
    }
  })
}