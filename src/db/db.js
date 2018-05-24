var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/';

export const dbs = cb => {
  MongoClient.connect(url, function(err, dbo) {
    if (err) cb(err, null);
    cb(null, dbo);
  });
};
