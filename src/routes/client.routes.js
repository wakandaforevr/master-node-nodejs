import { Router } from 'express';

import * as AccountController from '../controllers/account.controller';
import * as VpnController from '../controllers/vpn.controller';
import * as TransactionController from '../controllers/transactions';
import * as AccountValidations from '../validations/account.validation';
import * as VpnValidations from '../validations/vpn.validation';

const routes = new Router();

routes.post('/account', AccountValidations.validateCreateAccount, AccountController.createAccount);
routes.post('/account/balance', AccountValidations.getBalance, AccountController.getBalance);
routes.post('/raw-transaction', AccountValidations.rawTransaction, TransactionController.rawTransaction); 
routes.post('/vpn', VpnValidations.getVpnCredentials, VpnController.getVpnCredentials);
routes.post('/vpn/current', VpnController.getCurrentVpnUsage)
routes.get('/vpn/list', VpnController.getVpnsList);
routes.post('/vpn/usage', VpnController.getVpnUsage);
routes.post('/vpn/pay', VpnValidations.payVpnUsage, VpnController.payVpnUsage);
routes.post('/vpn/report', VpnController.reportPayment);

export default routes;