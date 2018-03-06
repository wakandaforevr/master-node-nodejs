import { Router } from 'express';
import * as NodeController from '../controllers/node.controller';
import * as AccountController from '../controllers/account.controller';
import * as VpnController from '../controllers/vpn.controller';



const routes = new Router();

routes.post('/account', AccountController.createAccount);
routes.post('/balance', AccountController.getBalance);
routes.post('/register', NodeController.registerNode);
routes.post('/update-nodeinfo', NodeController.updateNodeInfo);
routes.post('/deregister', NodeController.deRegisterNode);
routes.post('/add-usage',VpnController.addVpnUsage );

export default routes;