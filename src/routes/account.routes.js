import { Router } from 'express';
import * as AccountController from '../controllers/account.controller';

const routes = new Router();

routes.post('/', AccountController.createAccount);
routes.post('/balance', AccountController.getBalance);

export default routes;
