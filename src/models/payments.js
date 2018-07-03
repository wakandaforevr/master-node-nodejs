import { Schema, model } from "mongoose";

var paymentSchema = new Schema({
  timestamp: Number,
  paid_count: Number,
  unpaid_count: Number
});

export const Payments = model('payments', paymentSchema);