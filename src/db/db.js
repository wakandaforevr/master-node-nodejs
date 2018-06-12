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
  global.db = dbo.db('sentinel1')
})

exports.dbs = dbs;