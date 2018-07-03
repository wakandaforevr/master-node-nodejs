import { Schema, model } from "mongoose";

var logSchema = new Schema({
  os: String,
  account_addr: String,
  error_str: String,
  log_type: String
});

export const Logs = model('logs', logSchema);