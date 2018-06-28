import request from 'request'
import axios from 'axios';
import _ from 'lodash'
import async from 'async'
import { FEE_PERCENTAGE, TOKENS } from '../config/swaps';
import { DECIMALS } from '../config/vars';

function Tokens() {
  this.tokens = {}
  for (let i = 0; i < TOKENS.length; i++)
    this.tokens[TOKENS[i].symbol] = TOKENS[i]
}

Tokens.prototype.getToken = function (symbol = null, address = null) {
  if (symbol) {
    return this.tokens[symbol]
  } else if (address) {
    keys = Object.keys(this.tokens)
    for (let i = 0; i < keys.length; i++) {
      let token = this.tokens[keys[i]]
      if (token[address] === address)
        return token
    }
  } else {
    return null
  }
}

Tokens.prototype.getPrice = function (token, cb) {
  let price = null;

  axios.get(token['price_url'])
    .then((res) => {
      cb(parseFloat(res.data[0]['price_btc']))
    })
    .catch((err) => {
      console.log('err', err)
    })
}

Tokens.prototype.calculateSents = function (token, value, cb) {
  let sentUsd = null;
  let tokenUsd = null;
  let that = this;
  let sents = null;
  let name = null;

  value = value / (1.0 * Math.pow(10, token['decimals']))

  async.waterfall([
    (next) => {
      name = that.getToken(null, 'SENTinel')
      next()
    }, (next) => {
      that.getPrice(name, (resp) => {
        sentUsd = resp;
        next()
      })
    }, (next) => {
      that.getPrice(token, (resp) => {
        tokenUsd = resp
        next()
      })
    }, (next) => {
      sents = tokenUsd / sentUsd;
      sents = parseInt((sents * value) * DECIMALS);
      next();
    }
  ], (err, resp) => {
    console.log('sents', sents)
    return cb(sents)
  })
}

Tokens.prototype.exchange = function (fromToken, toToken, value, cb) {
  value = value / (1.0 * (Math.pow(10, fromToken['decimals'])))
  let that = this;
  let fromPrice = null;
  let toPrice = null;

  async.waterfall([
    (next) => {
      that.getPrice(fromToken, (price) => {
        fromPrice = price;
        next();
      })
    }, (next) => {
      that.getPrice(toToken, (price) => {
        toPrice = price;
        next();
      })
    }
  ], (err, resp) => {
    value = value * (fromPrice / toPrice) * (1.0 - FEE_PERCENTAGE)
    value = value * Math.pow(10, toToken['decimals'])
    cb(value)
  })
}

module.exports.tokens = new Tokens()