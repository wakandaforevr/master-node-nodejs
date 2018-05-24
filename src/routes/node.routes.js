import { Router } from 'express';
import * as NodeController from '../controllers/node.controller';

const routes = new Router();

routes.post('/register', NodeController.registerNode);
routes.post('/update-nodeinfo', NodeController.updateNodeInfo);
routes.post('/deregister', NodeController.deRegisterNode);

export default routes;
