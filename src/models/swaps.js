import { Schema, model } from "mongoose";

var swapSchema = new Schema({
  from_symbol: String,
  to_symbol: String,
  from_address: String,
  to_address: String,
  time_0: Number,
  status: Number
});

export const Swaps = model('swaps', swapSchema);