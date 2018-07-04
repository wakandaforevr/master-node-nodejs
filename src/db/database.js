import mongoose from "mongoose";

let uri = `mongodb://localhost:27017/sentinel`;

export const dbo = () => {
  mongoose.connect(uri, (err, db) => {
    if (err) throw err;
    else {
      console.log('mongoDB is running');
    }
  })
}

const insert = (Obj, cb) => {
  Obj.save((err, resp) => {
    if (err) cb(err, null)
    else cb(null, resp)
  })
}

export default {
  dbo, insert
}
