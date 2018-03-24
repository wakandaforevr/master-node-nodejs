import * as eth_helper from '../helpers/eth';

export const rawTransaction = (req, res) => {
  let tx_data = req.body['tx_data'];
  let net = req.body['net'];

  eth_helper.rawtransaction(tx_data, net, (err, tx_hash) => {
    if (err) {
      res.send({
        'success': false,
        'error': err,
        'message': 'Error occurred while initiating the transaction.'
      })
    } else {
      res.send({
        'success': true,
        'tx_hash': tx_hash,
        'message': 'Transaction initiated successfully.'
      })
    }
  })
}