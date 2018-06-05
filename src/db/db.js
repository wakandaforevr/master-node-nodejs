var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

const dbs = function (cb) {
  MongoClient.connect(url, function (err, dbo) {
    if (err) cb(err, null);
    cb(null, dbo);
  });
}

global.db = null;

dbs(function (err, dbo) {
  console.log('got the db')
  global.db = dbo.db('sentinel')
})

exports.dbs = dbs;