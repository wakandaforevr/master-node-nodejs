import { Schema, model } from "mongoose";

var statisticSchema = new Schema({
  timestamp: Number,
  nodes: {
    up: Number,
    total: Number
  }
});

export const Statistics = model('statistics', statisticSchema);