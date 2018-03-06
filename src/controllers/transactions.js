import eth_helper from '../eth/eth';

export const rawTransaction = (req, res) => {
  let tx_data = req.body['tx_data'];
  eth_helper.rawTransaction(tx_data, (err, resp) => {
    if (err) {
      res.send({
        'success': false,
        'error': error,
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