import chai from "chai";
import chaiHttp from "chai-http";

import server from "../../../src";

const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const vpnRoute = '/api/client/vpn';
const vpnListRoute = '/api/client/vpn/list';
const payVpnUsage = '/api/client/vpn/pay'
const addVpnUsage = '/api/node/add-usage';

const correctDetails = {
  account_addr: '0xd16e64a4083bd4f973df66b75ab266987e509fe6',
  vpn_address: '0xd16e64a4083bd4f973df66b75ab266987e509fe6'
}

const payVpnUsageDetails = {
  from_addr: '0xd16e64a4083bd4f973df66b75ab266987e509fe6',
  amount: '100',
  session_id: '0xd16e64a4083bd4f973df66b75ab266987e509fe6',
  tx_data: '0xf9012c8307a12084773594008307a1209411cb41b3b9387ccfa9cbf71525fa658107d2e3fd80b8c4ac4c60b7000000000000000000000000d16e64a4083bd4f973df66b75ab266987e509fe6000000000000000000000000d16e64a4083bd4f973df66b75ab266987e509fe600000000000000000000000000000000000000000000000000000002540be400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000015af1d78b5000000000000000000000000000000000000000000000000000000005aa260be1ba0856e010080c96d45dad83f93180895d5fa84222ada7bfd5dfcfa9579a5637343a0721a79dcb5cde7f6ff651ff503841f946204cc7169402d45b699d50ca1acd9ea'
}

const addVpnUsageDetails = {
  from_addr: '0xd16e64a4083bd4f973df66b75ab266987e509fe6',
  sent_bytes: 10000000000,
  session_duration: '0'
}

describe('Route for get vpn credentials', () => {
  describe('/POST ' + vpnRoute, () => {

    it('With correct details should return message or credentials', (done) => {
      chai.request(server)
        .post(vpnRoute)
        .send(correctDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    })

    it('With wrong account_addr should return invalid', (done) => {
      let wrongDetails = Object.assign({}, correctDetails);
      wrongDetails.account_addr = 'wrongAccount';
      chai.request(server)
        .post(vpnRoute)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('With wrong vpn_address should return invalid', (done) => {
      let wrongDetails = Object.assign({}, correctDetails);
      wrongDetails.vpn_address = 'vpnAddress';
      chai.request(server)
        .post(vpnRoute)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })
  });
});

describe('Route for get vpns list', () => {
  describe('/GET ' + vpnListRoute, () => {

    it('it should return vpns list if any available', (done) => {
      chai.request(server)
        .get(vpnListRoute)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    }).timeout(5000)
  });
});

describe('Route for add vpn usage', () => {
  describe('/POST ' + addVpnUsage, () => {
    it('with correct details it sholud return transaction hash', (done) => {
      chai.request(server)
        .post(addVpnUsage)
        .send(addVpnUsageDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    }).timeout(5000)

    it('with wrong from_addr it sholud return invalid', (done) => {
      let wrongDetails = Object.assign({}, addVpnUsageDetails);
      delete wrongDetails.from_addr;
      chai.request(server)
        .post(addVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('with wrong sent_bytes it sholud return invalid', (done) => {
      let wrongDetails = Object.assign({}, addVpnUsageDetails);
      delete wrongDetails.sent_bytes;
      chai.request(server)
        .post(addVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('with wrong session_duration it sholud return invalid', (done) => {
      let wrongDetails = Object.assign({}, addVpnUsageDetails);
      delete wrongDetails.session_duration;
      chai.request(server)
        .post(addVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })
  });
});

describe('Route for pay vpn usage', () => {
  describe('/POST ' + payVpnUsage, () => {

    it('return success message with correct transaction details', (done) => {
      chai.request(server)
        .post(payVpnUsage)
        .send(payVpnUsageDetails)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          done();
        });
    }).timeout(5000);

    it('with wrong from_addr should return invalid', (done) => {
      let wrongDetails = Object.assign({}, payVpnUsageDetails);
      wrongDetails.from_addr = 'wrongAddress';
      chai.request(server)
        .post(payVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('with wrong amount should return invalid', (done) => {
      let wrongDetails = Object.assign({}, payVpnUsageDetails);
      delete wrongDetails.amount;
      chai.request(server)
        .post(payVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('with wrong session_id should return invalid', (done) => {
      let wrongDetails = Object.assign({}, payVpnUsageDetails);
      wrongDetails.session_id = 'wrongAddress';
      chai.request(server)
        .post(payVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })

    it('with wrong tx_datas should return invalid', (done) => {
      let wrongDetails = Object.assign({}, payVpnUsageDetails);
      delete wrongDetails.tx_data;
      chai.request(server)
        .post(payVpnUsage)
        .send(wrongDetails)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          done();
        });
    })
  });
});

