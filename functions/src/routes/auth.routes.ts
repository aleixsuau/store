import * as express from 'express';
import { _login, _getAppConfig, _handleServerErrors } from '../utils';

export const authRouter = express.Router();

async function login(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const username = req.body.username;
  const password = req.body.password;
  console.log('_login', siteId, username, password);

  try {
    const tokenResponse = await _login(siteId, username, password);

    res.status(tokenResponse.status).json(tokenResponse);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

authRouter
  .route('/')
  .post(login);
