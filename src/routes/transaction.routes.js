import { Router } from 'express';

import * as transactionController from '../controllers/transactions';

const routes = new Router();

routes.post('/', transactionController.rawTransaction);

export default routes;
