import { DECIMALS } from '../utils/config'
import { dbs } from '../db/db'
import * as eth_helper from '../helpers/eth'

let db = null;
dbs((err, dbo) => {
  db = dbo.db('mydb')
})

const check_free = (to_addr, cb) => {
  db.collection('free').findOne({ to_addr: to_addr }, (err, tx) => {
    if (!tx) cb(false)
    else cb(true)
  })
}

const insert_free = (to_addr, cb) => {
  db.collection('free').insertOne({
    to_addr: to_addr
  })
}

export const getFreeAmount = (req, res) => {

  let account_addr = req.body['account_addr'];
  let eths = parseInt(0.25 * Math.pow(10, 18))
  let sents = parseInt(1000 * (DECIMALS * 1.0))

  check_free(account_addr, (tx_done) => {
    if (tx_done) {
      res.send({
        'success': false,
        'message': 'Test Tokens already claimed'
      })
    } else {
      eth_helper.free(account_addr, eths, sents, (errors, tx_hashes) => {
        if (errors.length > 0) {
          res.send({
            'success': false,
            'errors': errors,
            'tx_hashes': tx_hashes,
            'message': 'Error occurred while transferring free amount.'
          })
        } else {
          insert_free(account_addr);
          res.send({
            'success': true,
            'errors': errors,
            'tx_hashes': tx_hashes,
            'message': 'Successfully transferred Test Tokens'
          })
        }
      })
    }
  })
}