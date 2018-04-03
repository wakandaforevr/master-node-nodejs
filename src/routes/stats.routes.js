import { Router } from 'express';
import * as NodeController from '../controllers/node.controller'

const routes = new Router();

routes.get('/sessions/daily-stats', NodeController.getDailySessionCount);
routes.get('/sessions/active-count', NodeController.getActiveSessionCount);
routes.get('/nodes/daily-stats', NodeController.getDailyNodeCount);
routes.get('/nodes/active-count', NodeController.getActiveNodeCount);
routes.get('/data/daily-stats', NodeController.getDailyDataCount);
routes.get('/data/total-data', NodeController.getTotalDataCount);
routes.get('/time/daily-stats', NodeController.getDailyDurationCount);
routes.get('/time/average-duration', NodeController.getAverageDuration);

export default routes;