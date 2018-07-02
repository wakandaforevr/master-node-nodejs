import { MongoClient } from "mongodb";
let url = "mongodb://localhost:27017/";

export const dbs = function (cb) {
  MongoClient.connect(url, function (err, dbo) {
    if (err) throw err;
    else cb(null, dbo);
  });
}

global.db = null;

dbs(function (err, dbo) {
  global.db = dbo.db('sentinel')
})