import { Schema, model } from "mongoose";

var freeSchema = new Schema({
  to_addr: String,
});

export const Free = model('frees', freeSchema);