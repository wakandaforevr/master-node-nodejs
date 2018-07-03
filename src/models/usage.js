import { Schema, model } from "mongoose";

var usageSchema = new Schema({
  from_addr: String,
  to_addr: String,
  sent_bytes: Number,
  session_duration: Number,
  amount: Number,
  timestamp: Number
});

export const Usage = model('usages', usageSchema);