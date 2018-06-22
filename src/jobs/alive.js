let schedule = require('node-schedule')
let async = require('async')
let dbo = require('../db/db')


export const alive = function (data) {
  let maxSecs = data.maxSecs || null;
  let db = null
  if (data.message == 'start') {
    schedule.scheduleJob('*/5 * * * * *', function () {
      let minTime = Date.now() / 1000 - maxSecs;

      async.waterfall([
        (next) => {
          dbo.dbs((err, dbo) => {
            db = dbo.db('sentinel1');
            next()
          })
        }, (next) => {
          db.collection('nodes').updateMany({
            'vpn.ping_on': {
              '$lt': minTime
            }
          }, {
              '$set': {
                'vpn.status': 'down'
              }
            }, (err, resp) => {
              if (err) throw err
              else next()
            })
        }
      ], (err, resp) => {
        console.log('alive')
      })
    })
  } else if (data.message == 'stop') {
    process.kill(process.id)
  }
}