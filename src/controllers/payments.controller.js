var time = require('time');
import { dbs } from '../db/db';
import { SENT_BALANCE, VPNSERVICE_ADDRESS } from '../utils/config';
import request from 'request';
import * as eth_manager from '../eth/eth';

export const getClientAddress = account_addr => {
  dbs(function(err, db) {
    db
      .collection('nodes')
      .findOne({ server_addr: account_addr }, (err, res) => {
        if (err) return err;
        else res.send(result);
      });
  });
};

export const AddVpnUsage = (req, res) => {
  let account_addr = req.body['account_addr'];
  let keystore = req.body['keystore'];
  let password = req.body['password'];
  let to_addr = get_client_address(account_addr);
  let received_bytes = req.body['received_bytes'];
  let sent_bytes = req.body['sent_bytes'];
  let session_duration = req.body['session_duration'];
  let amount = calculate_amount(sent_bytes) * DECIMALS;
  let timestamp = time.time();
  let to_addr = get_client_address(account_addr);
  let amount = sent_bytes / (1024.0 * 1024.0 * 1024.0) * 100.0 * DECIMALS;

  if (sent_bytes < 10 * 1024 * 1024) {
    res.send({
      success: False,
      error: 'Usage is less than 10 MB. So data is not added',
      message: 'Usage is less than 10 MB. So data is not added',
    });
  } else
    async.waterfall(
      [
        next => {
          eth_manager.addVpnUsage(
            account_addr,
            to_addr,
            received_bytes,
            sent_bytes,
            session_duration,
            amount,
            timestamp,
            keystore,
            password,
            (err, result) => {
              if (err) next(err, null);
              else next(null, result);
            },
          );
        },
      ],
      (err, result) => {
        if (err) {
          res.send({
            success: False,
            error: error,
            message: 'Error occurred while adding the VPN usage data.',
          });
        } else {
          res.send({
            success: True,
            tx_hash: tx_hash,
            message: 'VPN usage data will be added soon.',
          });
        }
      },
    );
};
