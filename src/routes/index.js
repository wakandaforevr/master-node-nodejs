/**
 * API Routes
 */

import { Router } from 'express';
import HTTPStatus from 'http-status';

import NodeRoutes from './node.routes';
import ClientRoutes from './client.routes';
import StatsRoutes from './stats.routes';
import TokenRoutes from './token.routes'

import * as DevController from '../dev/free'

import APIError from '../services/error';

// Middlewares
import logErrorService from '../services/log';

const routes = new Router();

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

routes.get('/', (req, res) => {
  res.status = 200
  res.send({
    'status': 'UP'
  })
})

routes.post('/', (req, res) => {
  res.status(200).send({
    'status': 'UP'
  })
})

routes.use('/client', ClientRoutes);
routes.use('/node', NodeRoutes);
routes.use('/stats', StatsRoutes);
routes.use('/tokens', TokenRoutes);

routes.use('/dev/free', DevController.getFreeAmount)

routes.all('*', (req, res, next) =>
  next(new APIError('Not Found!', HTTPStatus.NOT_FOUND, true)),
);

routes.use(logErrorService);

export default routes;
