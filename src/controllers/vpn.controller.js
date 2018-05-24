import async from 'async';
import request from 'request';
import { dbs } from '../db/db';
import { SENT_BALANCE, VPNSERVICE_ADDRESS } from '../utils/config';

import * as eth_manager from '../eth/eth';

export const getVpnCredentials = (req, res) => {
  let account = req.body['account'];
  let vpn_address = req.body['vpn_address'];
  let url = SENT_BALANCE + account.addr;

  async.waterfall(
    [
      next => {
        request.get({ url: url, json: true }, (err, r, result) => {
          if (err)
            next(
              {
                success: false,
                message: 'Error while checking your balance',
              },
              null,
            );
          else next(null, result);
        });
      },
      (result_data, next) => {
        let result = parseInt(result_data.result);
        result = result / Math.pow(10, 8);

        if (result >= 100) {
          eth_manager.getDueAmount(account.addr, (err, due) => {
            if (err) {
              next(
                {
                  success: false,
                  error: err,
                  message: 'Error occurred while checking the due amount.',
                },
                null,
              );
            } else if (due == 0) {
              let vpn_address_len = vpn_address.length;
              if (vpn_address_len > 0) {
                dbs((err, dbo) => {
                  if (err) {
                    next(err, null);
                  } else {
                    let db = dbo.db('mydb');
                    db
                      .collection('nodes')
                      .findOne(
                        { 'account.addr': vpn_address, 'vpn.status': 'up' },
                        { _id: 0, token: 0 },
                        (err, node) => {
                          dbo.close();
                          if (err) next(err, null);
                          else next(null, node);
                        },
                      );
                  }
                });
              } else {
                dbs((err, db) => {
                  if (err) {
                    next(err, null);
                  } else {
                    db
                      .collection('nodes')
                      .findOne({ 'vpn.status': 'up' }, { _id: 0, token: 0 }),
                      (err, node) => {
                        dbo.close();
                        if (err) next(err, null);
                        else next(null, node);
                      };
                  }
                });
              }
            } else {
              next(
                {
                  success: false,
                  message:
                    'You have due amount: ' +
                    due / 1.0 +
                    ' SENTs.' +
                    ' Please try after clearing the due.',
                },
                null,
              );
            }
          });
        } else {
          next(
            {
              success: false,
              message: 'Your balance is less than 100 sents',
            },
            null,
          );
        }
      },
      (node, next) => {
        if (!node) {
          if (vpn_address > 0)
            next(
              {
                success: false,
                message:
                  'VPN server is already occupied. Please try after sometime.',
              },
              null,
            );
          else
            next(
              {
                success: false,
                message:
                  'All VPN servers are occupied. Please try after sometime.',
              },
              null,
            );
        } else {
          let secretToken = 'hello';
          let node_address = node.ip;
          let message = {
            success: true,
            ip: node_address,
            port: 3000,
            token: secretToken,
          };
          let body = {
            account_addr: account.addr,
            token: secretToken,
          };
          let url = 'http://' + node_address + ':8333/master/sendToken';
          request.post(
            { url: url, body: JSON.stringify(body) },
            (err, r, res) => {
              next(null, message);
            },
          );
        }
      },
    ],
    (err, result) => {
      if (err) res.send(err);
      else res.send(result);
    },
  );
};

export const getVpnsList = (req, res) => {
  dbs((err, dbo) => {
    let db = dbo.db('mydb');
    db
      .collection('nodes')
      .find({ 'vpn.status': 'up' })
      .project({
        _id: 0,
        'account.addr': 1,
        location: 1,
        'net_speed.upload': 1,
        'net_speed.download': 1,
      })
      .toArray((err, list) => {
        console.log('err :', err, 'list :', list);
        if (err) res.send(err);
        else
          res.send({
            success: true,
            list: list,
          });
      });
  });
};

export const PutClientConnection = (req, res) => {
  let server_addr = req.body['vpn_addr'];
  let client_addr = req.body['account_addr'];
  dbs((err, dbo) => {
    let db = dbo.db('mydb');
    db
      .collection('connection')
      .findOne({ server_addr: server_addr }, (err, resp) => {
        console.log('resp :', resp);
        if (!resp) {
          db.collection('connection').insertOne(
            {
              server_addr: server_addr,
              client_addr: client_addr,
            },
            (err, resp) => {
              if (err) res.send(err);
              else res.send({ success: true });
            },
          );
        } else {
          db.findOneAndUpdate(
            { server_addr: server_addr },
            { $set: { client_addr: client_addr } },
            (err, resp) => {
              if (err) res.send(err);
              else res.send({ success: true });
            },
          );
        }
      });
  });
};

export const PayVpnUsage = (req, res) => {
  let rom_addr = req.body['from_addr'];
  let to_addr = req.body['to_addr'];
  let amount = req.body['amount'];
  let session_id = req.body['session_id'];
  let keystore = req.body['keystore'];
  let password = req.body['password'];
  let private_key = req.body['private_key'];
  keystore = json.loads(keystore);
  async.waterfall([
    next => {
      eth_manager.txHashes(
        from_addr,
        to_addr,
        amount,
        session_id,
        keystore,
        password,
        private_key,
        (err, result) => {
          if (err) next(err, null);
          else next(null, result);
        },
      );
    },
    (err, result) => {
      if (err) {
        res.send({
          success: False,
          errors: errors,
          tx_hashes: tx_hashes,
          message: 'Error occurred while paying VPN usage.',
        });
      } else {
        res.send({
          success: True,
          errors: errors,
          tx_hashes: tx_hashes,
          message: 'VPN payment is completed successfully.',
        });
      }
    },
  ]);
};

export const getVpnUsage = (req, res) => {
  let account_addr = req.body['account_addr'];
  async.waterfall(
    [
      next => {
        eth_manager.getVpnUsage(account_addr, (err, result) => {
          if (err) next(err, null);
          else next(null, result);
        });
      },
    ],
    (err, result) => {
      if (err) {
        res.send({ success: True, usage: usage });
      } else {
        res.send({
          success: False,
          error: error,
          message: 'Error occured while fetching the usage data.',
        });
      }
    },
  );
};
