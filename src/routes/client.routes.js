import { Router } from 'express';
import * as NodeController from '../controllers/node.controller';
import * as AccountController from '../controllers/account.controller';
import * as VpnController from '../controllers/vpn.controller';
import * as TransactionController from '../controllers/transactions';


const routes = new Router();

routes.post('/account', AccountController.createAccount);
routes.post('/balance', AccountController.getBalance);
routes.post('/raw-transaction', TransactionController.rawTransaction);
routes.post('/vpn/', VpnController.getVpnCredentials);
routes.get('/vpn/list', VpnController.getVpnsList);
routes.post('/vpn/pay', VpnController.payVpnUsage)
routes.post('/vpn/put-connection', VpnController.PutClientConnection);
routes.post('/vpn/usage', VpnController.getVpnUsage);

export default routes;