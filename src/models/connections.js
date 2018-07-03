import mongoose from "mongoose";
let Schema = mongoose.Schema

var connectionSchema = new Schema({
  usage: { down: Number, up: Number },
  session_name: String,
  start_time: Number,
  client_addr: String,
  account_addr: String,
  end_time: Number
});

export const Connections = mongoose.model('connections', connectionSchema);