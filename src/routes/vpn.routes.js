import { Router } from 'express';
import * as VpnController from '../controllers/vpn.controller';


const routes = new Router();

routes.post('/', VpnController.getVpnCredentials);
routes.get('/list', VpnController.getVpnsList);
routes.post('/put-connection', VpnController.PutClientConnection);
routes.post('/usage', VpnController.getVpnUsage);

export default routes;