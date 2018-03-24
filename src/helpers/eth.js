import { ETHManager, rinkeby, mainnet } from '../eth/eth';
import { sentinel_main, sentinel_rinkeby } from '../eth/sentinel_contract';
import * as vpn_manager from '../eth/vpn_contract';

import { DECIMALS, COINBASE_ADDRESS, COINBASE_PRIVATE_KEY } from '../utils/config';

export const createaccount = (password, cb) => {
  mainnet.createaccount(password, (err, account_details) => {
    cb(err, account_details);
  });
}

export const getbalances = (account_addr, cb) => {
  let balances = {
    main: {
      eths: null,
      sents: null
    },
    test: {
      eths: null,
      sents: null
    }
  }

  try {
    mainnet.getbalance(account_addr, (err, balance) => {
      balances.main.eths = balance
      sentinel_main.getbalance(account_addr, (err, balance) => {
        balances.main.sents = balance
        rinkeby.getbalance(account_addr, (err, balance) => {
          balances.test.eths = balance
          sentinel_rinkeby.getbalance(account_addr, (err, balance) => {
            balances.test.sents = balance
            cb(null, balances);
          })
        })
      })
    })
  } catch (error) {
    cb(error, null)
  }
}

export const transfersents = (from_addr, to_addr, amount, private_key, net, cb) => {
  if (net == 'main') {
    sentinel_main.transferamount(from_addr, to_addr, amount, private_key, (err, tx_hash) => {
      cb(err, tx_hash)
    })
  } else if (net == 'rinkeby') {
    sentinel_rinkeby.transferamount(from_addr, to_addr, amount, private_key, (err, tx_hash) => {
      cb(err, tx_hash)
    })
  }
}

export const transfereths = (from_addr, to_addr, amount, private_key, net, cb) => {
  if (net == 'main') {
    mainnet.transferamount(from_addr, to_addr, amount, private_key, (err, tx_hash) => {
      cb(err, tx_hash)
    })
  } else if (net == 'rinkeby') {
    rinkeby.transferamount(from_addr, to_addr, amount, private_key, (err, tx_hash) => {
      cb(err, tx_hash)
    })
  }
}

export const free = (to_addr, eths, sents, cb) => {
  let errors = [], tx_hashes = []

  let PRIVATE_KEY = Buffer.from(COINBASE_PRIVATE_KEY, 'hex');
  transfereths(COINBASE_ADDRESS, to_addr, eths, PRIVATE_KEY, 'rinkeby', (err, tx_hash) => {
    if (!err) {
      tx_hashes.push(tx_hash);
      transfersents(COINBASE_ADDRESS, to_addr, eths, PRIVATE_KEY, 'rinkeby', (err, tx_hash) => {
        if (!err) {
          tx_hashes.push(tx_hash);
          cb(errors, tx_hashes);
        } else {
          errors.push(errors);
          cb(errors, tx_hashes);
        }
      })
    } else {
      errors.push(err);
      cb(errors, tx_hashes);
    }
  });
}

export const getaccountaddress = (private_key, cb) => {
  mainnet.getaddress(private_key,
    (err, address) => {
      let account_address = address.substr(2)
      cb(null, account_address)
    })
}

export const rawtransaction = (tx_data, net, cb) => {
  if (net == 'main') {
    mainnet.sendrawtransaction(tx_data,
      (err, tx_hash) => {
        cb(err, tx_hash);
      })
  }
  else if (net == 'rinkeby') {
    rinkeby.sendrawtransaction(tx_data,
      (err, tx_hash) => {
        cb(err, tx_hash);
      })
  }
}

export const getdueamount = (account_addr, cb) => {
  vpn_manager.getdueamount(account_addr,
    (err, dueamount) => {
      cb(err, dueamount);
    });
}

export const getvpnsessions = (account_addr, cb) => {
  vpn_manager.getvpnsessions(account_addr, (err, sessions) => {
    cb(err, sessions);
  })
}

export const getinitialpayment = (account_addr, cb) => {
  vpn_manager.getinitialpayment(account_addr, (err, is_payed) => {
    cb(err, is_payed)
  })
}

export const transferamount = (from_addr, to_addr, amount, unit, keystore, password, private_key = null, cb) => {
  if (!private_key) {
    ETHManager.getprivatekey(keystore, password,
      (err, privateKey) => {
        private_key = privateKey
        if (err)
          return cb(err, null)
        if (unit == 'ETH') {
          ETHManager.transferamount(from_addr, to_addr, amount, private_key,
            (err, resp) => {
              cb(err, resp)
            })
        } else {
          sentinel_manager.transferamount(from_addr, to_addr, amount, private_key,
            (err, resp) => {
              cb(err, resp);
            })
        }
      })
  }
}

export const getvpnusage = (account_addr, cb) => {
  let usage = {
    'due': 0,
    'stats': {
      'received_bytes': 0,
      'duration': 0,
      'amount': 0
    },
    'sessions': []
  }
  vpn_manager.getvpnsessions(account_addr, (err, sessions) => {
    if (!err) {
      for (let index = 0; index < sessions; index++) {
        vpn_manager.getvpnusage(account_addr, index, (error, _usage) => {
          if (!error) {
            if (!_usage[5])
              usage['due'] += _usage[3] / (DECIMALS * 1.0)
            usage['stats']['received_bytes'] += _usage[1]
            usage['stats']['duration'] += _usage[2]
            usage['stats']['amount'] += _usage[3] / (DECIMALS * 1.0)
            usage['sessions'].append({
              'id': index,
              'account_addr': _usage[0],
              'received_bytes': _usage[1],
              'duration': _usage[2],
              'amount': _usage[3] / (DECIMALS * 1.0),
              'timestamp': _usage[4],
              'is_payed': _usage[5]
            })
          } else {
            cb(error, null)
          }
        })
      }
      cb(null, usage)
    } else {
      cb(err, null)
    }
  })
}

export const payvpnsession = (from_addr, amount, session_id, net, tx_data, payment_type, cb) => {
  let errors = []
  let tx_hashes = []
  rawtransaction(tx_data, net, (err1, tx_hash1) => {
    if (!err1) {
      tx_hashes.push(tx_hash1)
      if (payment_type == 'normal') {
        vpn_manager.payvpnsession(from_addr, amount, session_id, (err2, tx_hash2) => {
          if (!err2) {
            tx_hashes.push(tx_hash2)
            cb(errors, tx_hashes)
          } else {
            errors.push(err2)
            cb(errors, tx_hashes)
          }
        })
      } else if (payment_type == 'init') {
        vpn_manager.setinitialpayment(from_addr, (err2, tx_hash2) => {
          if (!err2) {
            tx_hashes.push(tx_hash2)
            cb(errors, tx_hashes)
          } else {
            errors.push(err2)
            cb(errors, tx_hashes)
          }
        })
      }
    } else {
      errors.push(err1)
    }
  })
}

export const addvpnusage = (from_addr, to_addr, sent_bytes, session_duration, amount, timestamp, cb) => {
  vpn_manager.addVpnUsage(from_addr, to_addr, sent_bytes, session_duration, amount, timestamp,
    (err, resp) => {
      cb(err, resp)
    })
}