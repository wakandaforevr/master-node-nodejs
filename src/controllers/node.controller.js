import async, { nextTick } from 'async';
import uuid from 'uuid/v4';
import { dbs } from '../db/db'

export const registerNode = (req, res) => {
  let account = req.body['account']
  let ip = req.body['ip']
  let location = req.body['location']
  let net_speed = req.body['net_speed']
  let vpn = req.body['vpn']
  let token = uuid();


  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        let db = dbo.db('mydb');
        db.collection('nodes').insertOne({
          'account': account,
          'token': token,
          'location': location,
          'ip': ip,
          'net_speed': net_speed,
          'vpn': vpn
        }, (err, resp) => {
          if (err) {
            next({
              'success': false,
              'message': 'Error occurred while registering the node.'
            }, null)
          }
          else if (resp.ops[0]._id) {
            next(null, {
              'success': true,
              'token': token,
              'message': 'Node registered successfully.'
            });
          }
        })
      })
    }
  ], (err, result) => {
    if (err) res.send(err);
    else res.send(result);
  })
}

export const updateNodeInfo = function (req, res) {
  let token = req.body['token'];
  let account = req.body['account'];
  let info = req.body['info'];


  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        let db = dbo.db('mydb');
        next(null, db)
      })
    }, (db, next) => {
      if (info['type'] == 'location') {
        let location = info['location'];
        db.collection('nodes').findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          { '$set': { 'location': location } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'net_speed') {
        let net_speed = info['net_speed']
        db.nodes.findOneAndUpdate(
          { 'account.addr': account.addr, 'token': token },
          { '$set': { 'net_speed': net_speed } },
          (err, node) => {
            if (err) next(err, null);
            else next(null, node);
          })
      } else if (info['type'] == 'vpn') {
        if (info.ovpn) {
          let ovpn = info['ovpn']
          db.nodes.findOneAndUpdate(
            { 'account.addr': account.addr, 'token': token },
            { '$set': { 'vpn.ovpn': ovpn } },
            (err, node) => {
              if (err) next(err, null);
              else next(null, node);
            })
        } else if (info.status) {
          let status = info['status']
          node = db.nodes.findOneAndUpdate(
            { 'account.addr': account.addr, 'token': token },
            { '$set': { 'vpn.status': status } },
            (err, node) => {
              if (err) next(err, null);
              else next(null, node);
            })
        }
      }
    }
  ], (err, node) => {
    if (!node) {
      res.send({
        'success': false,
        'message': 'Node is not registered.'
      })
    } else {
      res.send({
        'success': true,
        'message': 'Node info updated successfully.'
      });
    }
  })
}

export const deRegisterNode = (req, res) => {
  let account = req.body['account'];
  let token = req.body['token'];

  async.waterfall([
    (next) => {
      dbs((err, dbo) => {
        if (err) next(err, null)
        let db = dbo.db('mydb');
        next(null, db);
      })
    }, (db, next) => {
      db.collection('nodes').findOneAndDelete(
        { 'account.addr': account.addr, 'token': token },
        (err, node) => {
          if (!node.value) {
            next({
              'success': false,
              'message': 'Node is not registered.'
            }, null);
          } else {
            next(null, {
              'success': true,
              'message': 'Node deregistred successfully.'
            })
          }
        }
      )
    }
  ], (err, resp) => {
    if (err) res.send(err);
    else res.send(resp);
  })
}