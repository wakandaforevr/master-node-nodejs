import mongoose from "mongoose";

let Schema = mongoose.Schema

let validationSchema = new Schema({
  nodeID: String,
  invalidCount: Number,
  ipAddr: String
});

export const Validations = mongoose.model('Validation', validationSchema);