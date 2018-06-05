var schedule = require('node-schedule')
var async = require('async')
var dbo = require('../db/db')
// var ETHHelper = require('../helpers/eth')

import * as ETHHelper from '../helpers/eth';

export const payments = (message) => {
  var hour = 16;
  var minute = 26;
  var db = null;
  var paidCount = 0;
  var unPaidCount = 0;

  console.log('message in payments js is ', message)

  if (message === 'start') {
    var j = schedule.scheduleJob('*/45 * * * * *', () => {
      var currentTime = new Date()
      var timestamp = Date.now() / 1000
      async.waterfall([
        (next) => {
          if (currentTime.getHours() == hour && currentTime.getMinutes() == minute) {
            dbo.dbs((err, dbo) => {
              db = dbo.db('sentinel')
              next()
            })
          } else {
            next({}, null)
          }
        }, (next) => {
          db.collection('connections').aggregate([{
            '$match': {
              'start_time': {
                '$gte': timestamp - (24 * 60 * 60)
              }
            }
          }, {
            '$group': {
              '_id': '$client_addr'
            }
          }]).toArray((err, result) => {
            next(null, result)
          })
        }, (result, next) => {
          async.eachSeries(result, (addr, iterate) => {
            if (addr['_id']) {
              ETHHelper.getVpnUsage(addr['id'], (err, usage) => {
                if (!err) {
                  if (usage) {
                    var sessions = usage['sessions'];
                    sessions.map((session, index) => {
                      if (session['timestamp'] >= timestamp - 24 * 60 * 60) {
                        if (session['is_payed']) {
                          paidCount += parseInt(session['amount'])
                        } else {
                          unPaidCount += parseInt(session['amount'])
                        }
                      };
                      if (index == sessions.length - 1)
                        next()
                    })

                  } else {
                    next()
                  }
                }
              })
            }
          }, () => {
            db.collection('payments').update({
              'timestamp': timestamp
            }, {
                $set: {
                  'paid_count': paidCount,
                  'unpaid_count': unPaidCount
                }
              }, {
                'upsert': true
              })
          })
        }
      ], (err, resp) => {
        console.log('payments')
      })
    })
  }
}