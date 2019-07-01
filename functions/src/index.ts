import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from "body-parser";

// Initialize FB App
admin.initializeApp(functions.config().firebase);
const baseUrl = `https://api.mindbodyonline.com/public/v6`;
const DDBB = admin.firestore();
const server = express();

// Automatically allow cross-origin requests
server.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'SiteId'],
}));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));


// Add middleware to authenticate requests
// server.use(myMiddleware);

function _getAppConfig(siteId: string) {
  console.log('_getAppConfig', siteId)
  if (!siteId) { throw new Error('Please provide an ID'); }

  return DDBB.collection('config')
              .doc(siteId)
              .get()
              .then(config => {
                if (!config.exists || !config.data()){
                  console.log('No App with this ID');
                  throw new Error('No App with this ID');
                } else {
                  return config.data();
                }
              });
}

function _getConfig(siteId: string, req: express.Request, res: express.Response) {
  _getAppConfig(siteId)
    .then(appConfig => {
      // Keep apiKey private
      const {apiKey, ...appConfigCopy} = appConfig;
      res.status(200).send(appConfigCopy);
    })
    .catch(error => res.status(500).send(error));
}

function _login(siteId: string, username: string, password: string, res: express.Response, req?: express.Request) {
  console.log('req', req)
  console.log('_login', siteId, username, password);
  _getAppConfig(siteId)
    .then(appConfig => {
      console.log('appConfig', appConfig);
      const requestConfig = {
        url: `${baseUrl}/usertoken/issue`,
        headers: {
          'Api-Key': appConfig.apiKey,
          'SiteId': siteId,
        },
        json: {
          'Username': username,
          'Password': password,
        },
      }
      console.log('requestConfig', requestConfig);

      request
        .post(
          requestConfig,
          (error, response, body) => res.status(response.statusCode).send(body)
        );
    })
    .catch(error => res.status(500).send(error));
}

function _getClients(siteId: string, token: string, searchText: string, limit: string, offset: string, res: express.Response) {
  console.log('_getClients', siteId, token, limit, offset, searchText, `${baseUrl}/client/clients?${limit || '200'}&offset=${offset}`);

  if (!token) { res.status(401).send({message: 'Unauthorized'});}
  if (!siteId ) { res.status(422).send({message: 'SiteId param is missing'});}

  _getAppConfig(siteId)
    .then(appConfig => {
      console.log('appConfig', appConfig);
      const requestConfig = {
        url: `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}`,
        headers: {
          'Api-Key': appConfig.apiKey,
          'SiteId': siteId,
          'Authorization': token,
        },
      };

      if (searchText) {
        requestConfig.url += `${baseUrl}/client/clients?&SearchText=${searchText}`;
      }
      console.log('requestConfig', requestConfig);

      request
        .get(
          requestConfig,
          (error, response, body) => res.status(response.statusCode).send(body),
        );
    })
    .catch(error => res.status(500).send(error));
};

function _handleErrors(siteId: string, token: string, body: any,  res: express.Response) {
  console.log('_handleErrors', siteId, token, body);
  res.status(200).send({message: 'Error received'});
}

function _updateClient(clientId: string, client: any, siteId: string, token: string, res: express.Response) {
  console.log('_updateClient', clientId, client, siteId, token);
  _getAppConfig(siteId)
    .then(appConfig => {
      console.log('appConfig', appConfig);
      const requestConfig = {
        url: `${baseUrl}/client/updateclient?ClientIds=${clientId}`,
        headers: {
          'Api-Key': appConfig.apiKey,
          'SiteId': siteId,
          'Authorization': token,
        },
        json: {
          Client: client,
          // TODO: Set CrossRegionalUpdate from the Site configuration
          CrossRegionalUpdate: false,
        },
      };
      console.log('requestConfig', requestConfig)

      request
        .post(
          requestConfig,
          (error, response, body) => res.status(response.statusCode).send(body),
        );
    })
    .catch(error => res.status(500).send(error));
}

function _addClient(client: any, siteId: string, token: string, res: express.Response) {
  console.log('_addClient', client, siteId, token);
  _getAppConfig(siteId)
    .then(appConfig => {
      console.log('appConfig', appConfig);
      const requestConfig = {
        url: `${baseUrl}/client/addclient`,
        headers: {
          'Api-Key': appConfig.apiKey,
          'SiteId': siteId,
          'Authorization': token,
        },
        json: client,
      };
      console.log('requestConfig', requestConfig)

      request
        .post(
          requestConfig,
          (error, response, body) => res.status(response.statusCode).send(body),
        );
    })
    .catch(error => res.status(500).send(error));
}

/** ENDPOINTS **/
// server.get('/config/:siteId', (req, res) => res.send(_getConfig(req.params.siteId, req, res)));
// CLIENTS
server.get('/clients', (req, res) => _getClients(req.header('siteId'), req.header('Authorization'), req.query.SearchText, req.query.limit, req.query.offset, res));
server.post('/clients', (req, res) => _addClient(req.body.Client, req.header('siteId'), req.header('Authorization'), res));
server.patch('/clients/:clientId', (req, res) => _updateClient(req.params.clientId, req.body.Client, req.header('siteId'), req.header('Authorization'), res));
// AUTH
server.post('/auth', (req, res) => _login(req.header('siteId'), req.body.username, req.body.password, res, req));
// CONFIG
server.get('/config/:siteId', (req, res) => _getConfig(req.header('siteId'), req, res));
// ERRORS
server.post('/errors', (req, res) => _handleErrors(req.header('siteId'), req.header('Authorization'), req.body, res));
// server.get('/clients', (req, res) => _getClients(req.body.siteId, req.body.token, res));
/* server.post('/', (req, res) => res.send(Widgets.create()));
server.put('/:id', (req, res) => res.send(Widgets.update(req.params.id, req.body)));
server.delete('/:id', (req, res) => res.send(Widgets.delete(req.params.id)));
server.get('/', (req, res) => res.send(Widgets.list())); */

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);


// Initialize admin
/* admin.initializeApp(functions.config().firebase);
// Create DDBB
const corsHandler = cors({ origin: true });
const baseUrl = `https://api.mindbodyonline.com/public/v6`;
const DDBB = admin.firestore(); */

/* async function _getApiKey(id: string) {
  console.log('_getApiKey', id);
  const config = await DDBB.collection('sites').doc(id).get();

  if (!config.exists){
    throw new Error("App doesn't exist.")
  } else {
    return config.data();
  }
}; */

  /*
  // QUERY
  return DDBB
          .collection('sites')
          .where('id', '==', id)
          .get()
          .then(sitesQuerySnapShot => {
            return sitesQuerySnapShot.docs.map((documentSnapshot) => documentSnapshot.data());
          });

}*/

/* export const config = functions.https.onRequest((req, res) => {
  console.log('Auth req1:', req.params, req.body, req);
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => res.status(200).send());
  };

  return corsHandler(req, res, () => res.status(200).send('holi'));
}); */

/* export const auth = functions.https.onRequest((req, res) => {
  console.log('Auth req1:', req.method, req.body, req);
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => res.status(200).send());
  };

  if (req.method === 'POST') {
    const siteId = req.body.siteId;
    const Username = req.body.username;
    const Password = req.body.password;

    return _getApiKey(siteId)
            .then(apikey => {
              console.log('apikey', apikey);
              const headers = {
                'Api-Key': apikey,
                SiteId: siteId,
              };

              return request.post(
                    {
                      url: `${baseUrl}/usertoken/issue`,
                      headers,
                      body: { Username, Password },
                    },
                    (error, response, body) => {
                      console.log('body', body);
                      if (error) {
                        return corsHandler(req, res, () => res.status(401).send({message: 'Unauthorized: 401', error}));
                      } else {
                        return corsHandler(req, res, () => res.status(200).send(body));
                      }
                    });
                  })
                  .catch(error => error);
  }
}); */

/* export const clients = functions.https.onRequest((req, res) => {
  console.log('req5', req)
  if (req.method === 'OPTIONS') { return corsHandler(req, res, () => res.status(200).send())};

  if (req.method === 'GET') {
    const siteId = req.body.siteId;
    const token = req.body.token;

    return _getApiKey(siteId)
            .then(apikey => {
              console.log('apikey', apikey);
              const headers = {
                'Api-Key': apikey,
                SiteId: siteId,
                Authorization: token,
              };

            return request.get({
                      url: `${baseUrl}/client/clients`,
                      headers,
                    }, (error, response, body) => {
                      console.log('body', body);
                      return corsHandler(req, res, () => res.status(200).send(body));
                    });
            });

  }
});
 */
