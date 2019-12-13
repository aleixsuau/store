import * as express from 'express';
import { _getAppConfig, _handleServerErrors } from '../utils';


export const configRouter = express.Router();

function getConfig(req: express.Request, res: express.Response) {
  console.log('getConfig', req.app_config);
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;

  _getAppConfig(siteId)
    .then(appConfig => {
      if (!appConfig) {
        res.status(404).json('No app with this id');
      }
      // Keep apiKey private
      const {customization, id, queryLimit, test} = appConfig;
      res.status(200).json({customization, id, queryLimit, test, payments: { needs_iframe: appConfig.payments.needs_iframe }});
    })
    .catch(error => res.status(500).json(error));
}

configRouter
  .route('/:siteId')
  .get(getConfig);
