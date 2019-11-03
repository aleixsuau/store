import * as express from 'express';

export const errorRouter = express.Router();

function handleClientErrors(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('handleClientErrors', siteId, token, req.body);
  res.status(200).json({message: 'Error received'});
}

errorRouter
  .route('/')
  .post(handleClientErrors);
