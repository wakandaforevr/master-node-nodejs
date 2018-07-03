import mongoose from "mongoose";

let Schema = mongoose.Schema

let logSchema = new Schema({
  os: String,
  account_addr: String,
  error_str: String,
  log_type: String
});

export const Logs = mongoose.model('Log', logSchema);