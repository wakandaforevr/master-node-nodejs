import chai from "chai";
import chaiHttp from "chai-http";

import server from "../../../src";

const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const accountRoute = '/api/client/account';
const balanceRoute = '/api/client/account/balance';
const rawTransactionRoute = '/api/client/raw-transaction';

const correctDetails = {
  password: 'password',
  wallet_address: '0xd16e64a4083bd4f973df66b75ab266987e509fe6'
}

const rawTransactionDetails = {
  tx_data: '0xf9012c8307a12084773594008307a1209411cb41b3b9387ccfa9cbf71525fa658107d2e3fd80b8c4ac4c60b7000000000000000000000000d16e64a4083bd4f973df66b75ab266987e509fe6000000000000000000000000d16e64a4083bd4f973df66b75ab266987e509fe600000000000000000000000000000000000000000000000000000002540be400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000015af1d78b5000000000000000000000000000000000000000000000000000000005aa260be1ba0856e010080c96d45dad83f93180895d5fa84222ada7bfd5dfcfa9579a5637343a0721a79dcb5cde7f6ff651ff503841f946204cc7169402d45b699d50ca1acd9ea'
}


describe('Route creating account', () => {
  describe('/POST ' + accountRoute, () => {
    let wrongDetails = Object.assign({}, correctDetails);

    it('With correct details should return keystore', (done) => {
      chai.request(server)
        .post(accountRoute)
        .send(correctDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    })

    it('With wrong details should return invalid', (done) => {
      wrongDetails.password = null;
      chai.request(server)
        .post(accountRoute)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          expect(res.body.message).to.equal('"password" must be a string');
          done();
        });
    })
  });
});

describe('Route for checking balance', () => {
  describe('/POST ' + balanceRoute, () => {
    let wrongDetails = Object.assign({}, correctDetails);

    it('With correct wallet address should return balance', (done) => {
      chai.request(server)
        .post(balanceRoute)
        .send(correctDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    }).timeout(5000);

    it('With wrong wallet address should return invalid', (done) => {
      wrongDetails.wallet_address = 'wrongWallet';
      chai.request(server)
        .post(balanceRoute)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});

describe('Route for raw transaction', () => {
  describe('/POST ' + rawTransactionRoute, () => {

    it('with correct transaction data should return transaction hash', (done) => {
      chai.request(server)
        .post(rawTransactionRoute)
        .send(rawTransactionDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    });

    it('with wrong transaction data should return invalid', (done) => {
      let wrongDetails = Object.assign({}, rawTransactionDetails)
      wrongDetails.tx_data = null
      chai.request(server)
        .post(rawTransactionRoute)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
