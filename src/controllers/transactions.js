import * as EthHelper from '../helpers/eth';

export const rawTransaction = (req, res) => {
  let txData = req.body['txData'];
  let net = req.body['net'];

  EthHelper.rawTransaction(txData, net, (err, txHash) => {
    if (err) {
      res.send({
        'success': false,
        'error': err,
        'message': 'Error occurred while initiating the transaction.'
      })
    } else {
      res.send({
        'success': true,
        'txHash': txHash,
        'message': 'Transaction initiated successfully.'
      })
    }
  })
}