import axios from "axios";
import { BTC_BASED_COINS } from "../config/swaps";

function BTCHelper(coins) {
  this.coins = coins
}


BTCHelper.prototype.getNewAddress = function (symbol, cb) {
  let server = this.coins[symbol]
  let url = `http://${server['ip']}:${server['port']}/address`
  axios.get(url)
    .then((resp) => {
      resp = resp.data
      if (resp['success']) cb(resp['address'])
      else cb(null)
    })
    .catch((error) => {
      console.log('error')
      cb(null)
    })
}

BTCHelper.prototype.getBalance = function (address, symbol, cb) {
  let server = this.coins[symbol]
  let url = `http://${server['ip']}:${server['port']}/balance?address=${address}`
  axios.get(url)
    .then((resp) => {
      resp = resp.data      
      if (resp['success']) cb(resp['balance'])
      else cb(null)
    })
    .catch((error) => {
      console.log('error')
      cb(null)
    })
}

BTCHelper.prototype.transfer = function (toAddress, value, symbol, cb) {
  let server = this.coins[symbol]
  let url = `http://${server['ip']}:${server['port']}/transfer`
  axios.post(url, {
    'toAddress': toAddress,
    'value': value
  }).then((resp) => {
    resp = resp.data
    if (resp['success']) cb(resp['txHash'])
    else cb(null)
  }).catch((error) => {
    console.log('error')
    cb(null)
  })
}

module.exports.BTCHelper = new BTCHelper(BTC_BASED_COINS)
