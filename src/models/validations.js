import { Schema, model } from "mongoose";

var validationSchema = new Schema({
  nodeID: String,
  invalidCount: Number,
  ipAddr: String
});

export const Validations = model('validations', validationSchema);