import { Router } from 'express';
import * as AccountController from '../controllers/account.controller';
import * as AccountValidations from '../validations/account.validation';


const routes = new Router();

routes.post('/', AccountValidations.validateCreateAccount, AccountController.createAccount);
routes.post('/balance', AccountController.getBalance);


export default routes;