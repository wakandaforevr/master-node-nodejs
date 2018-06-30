import { Router } from "express";
import { updateCount, getActiveNodes } from "../controllers/validation.controller";

let routes = new Router()

routes.get('/', (req, res) => {
  res.send({
    'status': 'Up'
  })
})

routes.post('/', (req, res) => {
  res.send({
    'status': 'Up'
  })
})

routes.get('/active', getActiveNodes);
routes.post('/count', updateCount);

export default routes