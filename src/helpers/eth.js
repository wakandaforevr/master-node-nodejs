import md5 from 'md5'
import redis from 'redis'
import sleep from 'sleep'
import async from 'async'

import { ETHManager, rinkeby, mainnet } from '../eth/eth';
import { SentinelMain, SentinelRinkeby } from '../eth/sentinel_contract';
import { DECIMALS, COINBASE_ADDRESS, COINBASE_PRIVATE_KEY, SESSIONS_SALT } from '../utils/config';
import * as VpnManager from '../eth/vpn_contract';

var redisClient = redis.createClient();

const getEncodedSessionId = (accountAddr, index, cb) => {
  accountAddr = accountAddr.toString('utf8');
  index = index.toString();
  index = index.toString('utf8')
  let sessionId = md5(accountAddr + index + SESSIONS_SALT)
  return cb(sessionId)
}

const getValidNonce = (accountAddr, net, cb) => {
  let key = accountAddr + '_' + net;
  let previousNonce = redisClient.get(key);
  let error = -1;
  let nonce = -1;

  if (previousNonce)
    previousNonce = parseInt(previousNonce);

  if (net == 'main') {
    mainnet.getVpnSessionCount(accountAddr, (err, nonce) => {
      if (!err && (!previousNonce || nonce > previousNonce)) {
        redisClient.set(key, nonce)
        return cb(nonce)
      } else {
        sleep.sleep(1)
        return getValidNonce(accountAddr, net, cb)
      }
    })
  } else if (net == 'rinkeby') {
    rinkeby.getVpnSessionCount(accountAddr, (err, non) => {
      if (!err && (!previousNonce || nonce > previousNonce)) {
        redisClient.set(key, nonce)
        return cb(nonce)
      } else {
        sleep.sleep(1)
        return getValidNonce(accountAddr, net, cb)
      }
    })
  }
}

export const createAccount = (password, cb) => {
  mainnet.createAccount(password, (err, accountDetails) => {
    cb(err, accountDetails);
  });
}

export const getBalances = (accountAddr, cb) => {
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
    mainnet.getBalance(accountAddr, (err, balance) => {
      balances.main.eths = balance
      SentinelMain.getBalance(accountAddr, (err, balance) => {
        balances.main.sents = balance
        rinkeby.getBalance(accountAddr, (err, balance) => {
          balances.test.eths = balance
          SentinelRinkeby.getBalance(accountAddr, (err, balance) => {
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

export const transferSents = (fromAddr, toAddr, amount, privateKey, net, cb) => {
  if (net == 'main') {
    SentinelMain.transferAmount(fromAddr, toAddr, amount, privateKey, (err, txHash) => {
      cb(err, txHash)
    })
  } else if (net == 'rinkeby') {
    SentinelRinkeby.transferAmount(fromAddr, toAddr, amount, privateKey, (err, txHash) => {
      cb(err, txHash)
    })
  }
}

export const transferEths = (fromAddr, toAddr, amount, privateKey, net, cb) => {
  if (net == 'main') {
    mainnet.transferAmount(fromAddr, toAddr, amount, privateKey, (err, txHash) => {
      cb(err, txHash)
    })
  } else if (net == 'rinkeby') {
    rinkeby.transferAmount(fromAddr, toAddr, amount, privateKey, (err, txHash) => {
      cb(err, txHash)
    })
  }
}

export const free = (toAddr, eths, sents, cb) => {
  let errors = [], txHashes = []

  let PRIVATE_KEY = Buffer.from(COINBASE_PRIVATE_KEY, 'hex');
  transferEths(COINBASE_ADDRESS, toAddr, eths, PRIVATE_KEY, 'rinkeby', (err, txHash) => {
    if (!err) {
      txHashes.push(txHash);
      transferSents(COINBASE_ADDRESS, toAddr, eths, PRIVATE_KEY, 'rinkeby', (err, txHash) => {
        if (!err) {
          txHashes.push(txHash);
          cb(errors, txHashes);
        } else {
          errors.push(errors);
          cb(errors, txHashes);
        }
      })
    } else {
      errors.push(err);
      cb(errors, txHashes);
    }
  });
}

export const getaccountaddress = (privateKey, cb) => {
  mainnet.getaddress(privateKey,
    (err, address) => {
      let accountAddress = address.substr(2)
      cb(null, accountAddress)
    })
}

export const rawTransaction = (txData, net, cb) => {
  if (net == 'main') {
    mainnet.sendRawTransaction(txData,
      (err, txHash) => {
        cb(err, txHash);
      })
  }
  else if (net == 'rinkeby') {
    rinkeby.sendRawTransaction(txData,
      (err, txHash) => {
        cb(err, txHash);
      })
  }
}

export const getDueAmount = (accountAddr, cb) => {
  VpnManager.getDueAmount(accountAddr,
    (err, dueAmount) => {
      cb(err, dueAmount);
    });
}

export const getvpnsessions = (account_addr, cb) => {
  VpnManager.getvpnsessions(account_addr, (err, sessions) => {
    cb(err, sessions);
  })
}

export const getInitialPayment = (accountAddr, cb) => {
  VpnManager.getInitialPayment(accountAddr, (err, isPayed) => {
    cb(err, isPayed)
  })
}

export const transferAmount = (fromAddr, toAddr, amount, unit, keystore, password, privateKey = null, cb) => {
  if (!privateKey) {
    ETHManager.getprivatekey(keystore, password,
      (err, privateKey) => {
        privateKey = privateKey
        if (err)
          return cb(err, null)
        if (unit == 'ETH') {
          ETHManager.transferAmount(fromAddr, toAddr, amount, privateKey,
            (err, resp) => {
              cb(err, resp)
            })
        } else {
          SentinelMain.transferAmount(fromAddr, toAddr, amount, privateKey,
            (err, resp) => {
              cb(err, resp);
            })
        }
      })
  }
}

export const getVpnUsage = async (accountAddr, cb) => {
  let usage = {
    'due': 0,
    'stats': {
      'receivedBytes': 0,
      'duration': 0,
      'amount': 0
    },
    'sessions': []
  }
  VpnManager.getVpnSessionCount(accountAddr, (err, sessions) => {
    console.log('sessions', sessions)
    if (!err) {
      async.times(sessions, (index, next) => {
        getEncodedSessionId(accountAddr, index, (sessionId) => {
          VpnManager.getVpnUsage(accountAddr, sessionId, (error, _usage) => {
            if (!error) {
              if (!_usage[5])
                usage['due'] += _usage[3]
              usage['stats']['receivedBytes'] += parseInt(_usage[1])
              usage['stats']['duration'] += parseInt(_usage[2])
              usage['stats']['amount'] += parseInt(_usage[3])
              usage['sessions'].push({
                'id': index,
                'accountAddr': _usage[0],
                'receivedBytes': _usage[1],
                'sessionDuration': _usage[2],
                'amount': _usage[3],
                'timeStamp': _usage[4],
                'isPayed': _usage[5]
              })
              next()
            } else {
              return cb(error, null)
            }
          })
        })
      }, () => {
        return cb(null, usage)
      })
    } else {
      cb(err, null)
    }
  })
}

export const payVpnSession = (fromAddr, amount, sessionId, net, txData, paymentType, cb) => {
  let errors = []
  let txHashes = []

  rawTransaction(txData, net, (err1, txHash1) => {
    if (!err1) {
      txHashes.push(txHash1)
      getValidNonce(COINBASE_ADDRESS, 'rinkeby', (nonce) => {
        if (paymentType == 'init') {
          VpnManager.setInitialPayment(fromAddr, nonce, (err2, txHash2) => {
            if (!err2) {
              txHashes.push(txHash2)
              return cb(errors, txHashes)
            } else {
              errors.push(err2)
              return cb(errors, txHashes)
            }
          })
        } else if (paymentType == 'normal') {
          VpnManager.payVpnSession(fromAddr, amount, sessionId, nonce, (err2, txHash2) => {
            if (!err2) {
              txHashes.push(txHash2)
              return cb(errors, txHashes)
            } else {
              errors.push(err2)
              return cb(errors, txHashes)
            }
          })
        }
      })
    } else {
      errors.push(err1)
      return cb(errors, txHashes);
    }
  })
}

export const addVpnUsage = (fromAddr, toAddr, sentBytes, sessionDuration, amount, timeStamp, cb) => {
  VpnManager.addVpnUsage(fromAddr, toAddr, sentBytes, sessionDuration, amount, timeStamp,
    (err, resp) => {
      cb(err, resp)
    })
}