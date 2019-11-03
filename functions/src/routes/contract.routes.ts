import * as express from 'express';
import { _handleServerErrors} from '../utils';
import { _getContracts } from '../contracts';


export const contractRouter = express.Router();

async function getContracts(req: express.Request, res: express.Response) {
  // TODO: IMPORTANT: We have to return the contracts without auth because the
  // iframe IContracts select is not secured
  // TODO: Replace this mock with the call to MindBody
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('getContracts', siteId, token);

  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    // const appConfig = await _getAppConfig(siteId);
    const contracts = await _getContracts(siteId, token);

    res.status(200).json(contracts);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

contractRouter
  .route('/')
  .get(getContracts);
