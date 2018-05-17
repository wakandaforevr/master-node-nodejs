import async from 'async'

import { TOKENS } from '../token_config'
import { tokens } from '../helpers/tokens'

export const getAvailableTokens = (req, res) => {
  let dailyCount = [];
  let token = []
  token = Object.assign([], TOKENS)

  token.map((item, index) => {
    delete item.price_url;
    token[index] = item;
  })
  res.status = 200;
  res.send({
    'success': true,
    'tokens': token,
  })
}

export const getSents = (req, res) => {
  console.log('query', req.query)
  let toAddr = req.query['addr'];
  toAddr = toAddr.toString();
  let value = req.query['value'];
  let token = tokens.getToken(toAddr)
  console.log('token', token);

  if (token) {
    let sents = tokens.calculateSents(token, value)
    res.send({
      'success': true,
      'sents': sents
    })
  } else {
    res.send({
      'success': false,
      'message': 'No token found.'
    })
  }
}