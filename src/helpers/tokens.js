import request from 'request'
import { DECIMALS } from '../utils/config'
import { TOKENS } from '../token_config'
import _ from 'lodash'

function Tokens() {
  this.prices = {}
}

Tokens.prototype.getToken = function (address = null, name = null) {
  let Token = null;

  if (address) {
    TOKENS.map((token) => {
      if (token['address'] == address) {
        Token = token;
        return;
      }
    })
  } else if (name) {
    TOKENS.map((token) => {
      if (token['name'] == name) {
        Token = token;
        return;
      }
    })
  }

  if (Token && Token.length > 0)
    return Token[0]
  return null
}

Tokens.prototype.getUsdPrice = function (token, cb) {
  let usdPrice = null;
  let that = this;
  that.prices.map((name) => {
    if (name === token['name']) {
      usdPrice = name;
      return;
    }
  })
  try {
    let res = JSON.parse(request(token['price_url'], (error, response, body) => {
      let data = JSON.parse(body)
      usdPrice = parseFloat(data[0]['price_usd']);
      that.prices[token['name']] = usdPrice;
    }))
  } catch (error) {
    console.log(error)
  } finally {
    cb(usdPrice);
  }
}

Tokens.prototype.calculateSents = function (token, value, cb) {
  let sentUsd = null;
  let tokenUsd = null;
  let that = this;
  let sents = null;

  value = value / (1.0 * Math.pow(10, token['decimals']))

  async.waterfall([
    (next) => {
      that.getToken(name = 'SENTinel', (name) => {
        next(null, name);
      })
    }, (name, next) => {
      that.getUsdPrice(name, (resp) => {
        sentUsd = resp;
        next()
      })
    }, (next) => {
      that.getUsdPrice(token, (resp) => {
        tokenUsd = resp
        next()
      })
    }, (next) => {
      sents = tokenUsd / sentUsd;
      sents = parseInt((sents * value) * DECIMALS);
      next();
    }
  ], (err, resp) => {
    return cb(sents)
  })
}

module.exports.tokens = new Tokens()