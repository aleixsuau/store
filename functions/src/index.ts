import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from "body-parser";
import axios from 'axios';

export class CustomError extends Error {
  code: number;

  constructor(
    message: string,
    code: number) {
      super(message);
      this.code = code;
      Error.captureStackTrace(this, CustomError);
  }
}

// Initialize FB App
admin.initializeApp(functions.config().firebase);
const baseUrl = `https://api.mindbodyonline.com/public/v6`;
const DDBB = admin.firestore();
const server = express();
const httpClient = axios;

// MIDDLEWARE
// Automatically allow cross-origin requests
server.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'SiteId'],
}));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

/*
// ADD appConfig in this middleware??
server.use(async (req, res, next) => {
  console.log('HELLO from the middleware:', req.header('siteId'));
  const siteId = req.header('siteId');
  const appConfig = await _getAppConfig(siteId, res);

  req['appConfig'] = appConfig;

  next();
}) */


// UTILS
export function _getAppConfig(siteId: string, res?: express.Response): Promise<IAppConfig> {
  console.log('_getAppConfig', siteId);
  if (!siteId) { throw new Error('Please provide an ID'); }

  return DDBB.collection('config')
              .doc(siteId)
              .get()
              .then(config => {
                // return config.data() as IAppConfig;
                if (!config.exists || !config.data()){
                  console.log('No App with this ID');
                  res.status(404).send({code: 404, message: 'No App with this ID'});
                  throw new CustomError('No App with this ID', 404);
                } else {
                  return config.data() as IAppConfig;
                }
              });
}

function handleClientErrors(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('handleClientErrors', siteId, token, req.body);
  res.status(200).send({message: 'Error received'});
}

function _handleServerErrors(error: any, res: express.Response) {
  if (error.response) {
    console.log('_handleServerErrors', error.response);
    const errorResponse: IMindbodyError = error.response.data;
    res.status(error.response.status).send(`MindBody Error: ${errorResponse.Error.Code}, ${errorResponse.Error.Message}`);
  } else {
    console.log('_handleServerErrors', error);
    res.status(error.code || 500).send(`${error.name || error.code}: ${error.message}`);
  }
}


// ROUTE HANDLERS
function getConfig(req: express.Request, res: express.Response) {
  const siteId = req.params.siteId;

  _getAppConfig(siteId)
    .then(appConfig => {
      // Keep apiKey private
      const {apiKey, ...appConfigCopy} = appConfig;
      res.status(200).send(appConfigCopy);
    })
    .catch(error => res.status(500).send(error));
}

async function login(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const username = req.body.username;
  const password = req.body.password;

  console.log('req', req)
  console.log('_login', siteId, username, password);
  try {
    const appConfig = await _getAppConfig(siteId, res);
    const url = `${baseUrl}/usertoken/issue`;
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      }
    };
    const tokenRequest = {
      Username: username,
      Password: password,
    };
    console.log('tokenRequest', tokenRequest, config);

    const tokenResponse = await httpClient.post(url, tokenRequest, config);
    console.log('tokenResponse', tokenResponse.status, tokenResponse.data);

    res.status(tokenResponse.status).send(tokenResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
  /* _getAppConfig(siteId)
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
    .catch(error => res.status(500).send(error)); */
}

async function getAllClients(req: express.Request, res: express.Response) {
  console.log('REQUEST getAllClients', req.appConfig);
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const searchText = req.query.SearchText;
  const limit = req.query.limit;
  const offset = req.query.offset;
  console.log('_getAllClients', siteId, token, limit, offset, searchText, `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`);

  if (!token) { res.status(401).send({message: 'Unauthorized'});}
  if (!siteId ) { res.status(422).send({message: 'SiteId param is missing'});}

  try {
    const appConfig = await _getAppConfig(siteId, res);
    const url = `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`;
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    const clientsResponse = await httpClient.get(url, config);

    res.status(clientsResponse.status).send(clientsResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function addClient(req: express.Request, res: express.Response) {
  const client: IClient = req.body.Client;
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('_addClient', client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...)(If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.

  try {
    const appConfig = await _getAppConfig(siteId, res);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    let paymentsConfig;

    if (isSavingANewCreditCard) {
      paymentsConfig = await _createPaymentsConfig(appConfig, client);
      console.log('paymentsConfig', paymentsConfig)
    }
    // Save the user to MindBody
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    const newClientResponse = await httpClient.post(`${baseUrl}/client/addclient`, client, config);
    console.log('newClientResponse', newClientResponse.data);

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (paymentsConfig) {
      await DDBB
              .collection(`payments/${appConfig.id}/clients`)
              .doc(`${newClientResponse.data.Client.UniqueId}`)
              .set(paymentsConfig);
    }
    console.log('newClient', Object.keys(newClientResponse), newClientResponse.data)
      res
        .status(newClientResponse.status)
        .send(newClientResponse.data.Client || newClientResponse.statusText);
  } catch (error) {
    console.log('catch', error, Object.keys(error));
    res.status(error.code).send(error.message);
  }
}

async function updateClient(req: express.Request, res: express.Response) {
  const clientId = req.params.id;
  const client = req.body.Client;
  const siteId = req.header('siteId');
  const token = req.header('Authorization');

  console.log('_updateClient', clientId, client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...) (If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.

  // TODO: handle remove card when the user had a credit card and updates without credit card
  try {
    const appConfig = await _getAppConfig(siteId, res);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    let paymentsConfig;

    if (isSavingANewCreditCard) {
      paymentsConfig = await _createPaymentsConfig(appConfig, client);
      console.log('paymentsConfig', paymentsConfig)
    }

    console.log('_updateClient paymentsConfig', paymentsConfig);
    // Update the user on MindBody
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    const updatedClient = {
      Client: client,
      // TODO: Set CrossRegionalUpdate from the Site configuration
      CrossRegionalUpdate: false,
    };
    console.log('updatedClientResponse url:', `${baseUrl}/client/updateclient?ClientIds=${clientId}`, updatedClient, config);
    const updatedClientResponse = await httpClient.post(`${baseUrl}/client/updateclient?ClientIds=${clientId}`, updatedClient, config);
    console.log('updatedClientResponse', updatedClientResponse.data, updatedClientResponse.data.Client);

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (isSavingANewCreditCard) {
      await DDBB
              .collection(`payments/${appConfig.id}/clients`)
              .doc(`${updatedClientResponse.data.Client.UniqueId}`)
              .set(paymentsConfig);
    }
    console.log('updatedClientResponse: ', Object.keys(updatedClientResponse), updatedClientResponse.data)
      res
        .status(updatedClientResponse.status)
        .send(updatedClientResponse.data.Client || updatedClientResponse.statusText);
  } catch (error) {
    console.log('updatedClient catch', error.response, error.code, error.message, Object.keys(error), error.response, error.toJSON);
    res.status(error.code).send(error.message);
  }


  /* _getAppConfig(siteId)
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
    .catch(error => res.status(500).send(error)); */
}

async function addContract(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contract = req.body;
  console.log('addContract', siteId, token, clientId, contract);

  try {
    const appConfig = await _getAppConfig(siteId);
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    // TODO: replace this mocked data with the contract's data
    // Right now the /contracts endpoint is not working in test :(
    // REMEMBER: We need to pass the correct amount on
    // cartOrder.Payments[0].Metadata.Amount, if not MindBody
    // throws an error.
    const cartOrder = {
      ClientId: clientId,
      Test: true,
      Items: [
        {
          Item: {
            Type: 'Service',
            Metadata: {
              Id: '1364', // contract.Id,
            }
          },
          DiscountAmount: 0,
          Quantity: 1
        }
      ],
      Payments: [
        {
          Type: 'Cash',
          Metadata: {
            Amount: 108, // contract.FirstPaymentAmountTotal,
          }
        }
      ]
    };
    // Check if the Cart total is correct and if the user is Authorized to sell
    const cartTotalResponse = await httpClient.post(`${baseUrl}/sale/checkoutshoppingcart`, cartOrder, config);
    console.log('cartTotalResponse', cartTotalResponse.data);
    const clientPaymentConfig = await _getPaymentsConfig(appConfig, clientId);
    console.log('clientPaymentConfig', clientPaymentConfig)

    if (clientPaymentConfig) {
      if (appConfig.payments.gateaway.name === 'mercadopago') {
        const paymentsApiToken = appConfig.test ? appConfig.payments.gateaway.apiToken.test : appConfig.payments.gateaway.apiToken.production;
        const paymentsApiKey = appConfig.test ? appConfig.payments.gateaway.apiKey.test : appConfig.payments.gateaway.apiKey.production;
        const cardTokenResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/card_tokens?public_key=${paymentsApiKey}`, { card_id: clientPaymentConfig.cardId, security_code: clientPaymentConfig.CVV })
        const cardToken = cardTokenResponse.data.id;
        const mercadopagoOrder = {
          transaction_amount: cartOrder.Payments[0].Metadata.Amount,
          token: cardToken,
          description: contract.Description,
          installments: 1,
          payer: {
              id: clientPaymentConfig.clientId,
              // email: customer.body.email,
          }
        };
        console.log('mercadopagoOrder: ', mercadopagoOrder, paymentsApiToken)

        const paymentResponse = await _makePaymentWithMercadopago(appConfig, paymentsApiToken, mercadopagoOrder);
        console.log('paymentResponse', paymentResponse);
        // TODO: Complete the sell pushing the contract to MindBody
      }
    } else {
      throw new CustomError('This client does not have Credit Card associated', 400);
    }
  } catch (error) {
    // _handleServerErrors(error, res);
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response) {
      const errorResponse = error.response.data;
      console.log('_getMercadopagoPaymentsConfig ERROR1:', errorResponse, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      const errorMessage = `${errorResponse.error}: ${errorResponse.cause[0].description}`;
      res.status(errorResponse.status).send(errorMessage);
    } else {
      res.status(error.code || 500).send(`${error.name}: ${error.message}`);
    }
  }
}

async function _getPaymentsConfig(appConfig: IAppConfig, clientId: number): Promise<IClientPaymentsConfig | null> {
  console.log('_getPaymentsConfig', appConfig, clientId);
  const clientPaymentsConfigSnapshop = await DDBB
                                              .collection('payments')
                                              .doc(appConfig.id)
                                              .collection('clients')
                                              .doc(`${clientId}`)
                                              .get();
  const clientPaymentsConfig = clientPaymentsConfigSnapshop.data() as IClientPaymentsConfig | null;

  return clientPaymentsConfig;
}

async function _createPaymentsConfig(appConfig: IAppConfig, client: IClient): Promise<IClientPaymentsConfig> | null {
  console.log('_createPaymentsConfig', appConfig, client, client.Id);
  const clientPaymentsConfigSnapshop = await DDBB
                                              .collection('payments')
                                              .doc(appConfig.id)
                                              .collection('clients')
                                              .doc(`${client.Id}`)
                                              .get();
  const clientPaymentsConfig = clientPaymentsConfigSnapshop.data() as IClientPaymentsConfig | null;

  // If the user comes with a CVV inside the credit card data, then
  // he is creating a new Credit Card (MindBody doesn't save CVV)
  if (appConfig.payments.gateaway.name === 'mercadopago') {
    return _createMercadopagoPaymentsConfig(appConfig, client, clientPaymentsConfig);
  }

  return null;
}

async function _createMercadopagoPaymentsConfig(
  appConfig: IAppConfig,
  client: IClient,
  clientPaymentsConfig: IClientPaymentsConfig,
  ): Promise<IClientPaymentsConfig> {
    console.log('_createMercadopagoPaymentsConfig', appConfig, client, clientPaymentsConfig)
  try {
    // 1 - Create a MercadoPago Credit Card token
    // 2 - Get the MercadoPago user's id or create
    //     a new MercadoPago user if he is a new one
    // 3 - Create a MercadoPago Credit Card (with
    //     the user's id and the Credit Card token)
    // 4 - If the client already had a saved credit card,
    //     delete it.
    const apiToken = appConfig.test ? appConfig.payments.gateaway.apiToken.test : appConfig.payments.gateaway.apiToken.production;
    const apiKey = appConfig.test ? appConfig.payments.gateaway.apiKey.test : appConfig.payments.gateaway.apiKey.production;
    const creditCardTokenRequest = {
      authenticate: true,
      card_number: client.ClientCreditCard.CardNumber.toString(),
      security_code: client.ClientCreditCard.CVV.toString(),
      expiration_month: client.ClientCreditCard.ExpMonth.toString(),
      expiration_year: client.ClientCreditCard.ExpYear.toString(),
      cardholder: {
        name: `${client.FirstName} ${client.LastName}`,
      }
    };
    console.log('apiKey', apiKey, creditCardTokenRequest)
    const creditCardToken = await httpClient.post(`${appConfig.payments.gateaway.url}/card_tokens?public_key=${apiKey}`, creditCardTokenRequest);
    const creditCardTokenId = creditCardToken.data.id;
    console.log('creditCardTokenId', creditCardTokenId, creditCardToken)
    let clientId;

    /* mercadopago.configure({
      sandbox: appConfig.test,
      access_token: apiToken,
    }); */

    // If the client already had a saved credit card,
    // then we get the Mercadopago id from his paymentsConfig
    // to save the card associated to him and delete his
    // old credit card
    // Else, we create a new client
    if (clientPaymentsConfig && clientPaymentsConfig.clientId) {
      clientId = clientPaymentsConfig.clientId;
    } else {
      const clientData = {
        email: client.Email,
        first_name: client.FirstName,
        last_name: client.LastName,
      }
      console.log('apiToken', apiToken, clientData)
      // const clientResponse = await mercadopago.customers.create(clientData, { token: apiToken });
      // clientId = clientResponse.body.id;
      const clientResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/customers?access_token=${apiToken}`, clientData);
      clientId = clientResponse.data.id;
      console.log('clientResponse', clientResponse.data);
    }

    // Associate the creditCardTokenId to a user (required by Mercadopago)
    const card = {
      token: creditCardTokenId,
      // id: clientId,
    }

    // const newCardResponse = await mercadopago.customers.cards.create(card);
    const newCardResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/customers/${clientId}/cards?access_token=${apiToken}`, card);
    const cardId = newCardResponse.data.id;

    console.log('newCardResponse', cardId, newCardResponse.data)

    // If the user already had a Credit Card, remove it after
    // saving the new one (we only allow one credit card per client)
    if (clientPaymentsConfig && clientPaymentsConfig.clientId) {
      /* const config = {
        headers: {
        'Api-Key': appConfig.apiKey,
        'Authorization': apiToken,
        }
      }; */
      console.log('Delete url:', `${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      const deleteCardResponse = await httpClient.delete(`${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      console.log('deleteCardResponse', deleteCardResponse);
      /* await mercadopago
              .customers
              .cards
              .delete(clientPaymentsConfig.clientId, clientPaymentsConfig.cardId)
              .catch((error: any) => {
                console.log('_createMercadopagoPaymentsConfig DELETE ERROR:', clientPaymentsConfig.clientId, clientPaymentsConfig.cardId, error.name, error.status, error.message, error);
                throw new CustomError(`${error.name}: ${error.cause[0].description || error.message}`, error.status);
              }) */
    }

    // Return paymentConfig to save it on Firebase
    // associated to the client's Mindbody id
    // We save the cardId in order to delete it
    // if a new Credit Card is Saved
    return {
      CVV: client.ClientCreditCard.CVV,
      clientId,
      cardToken: creditCardTokenId,
      cardId,
    };
  } catch (error) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response) {
      const errorResponse = error.response.data;
      console.log('_getMercadopagoPaymentsConfig ERROR1:', errorResponse, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      throw new CustomError(`${errorResponse.error}: ${errorResponse.cause[0].description}`, errorResponse.status);
    } else {
      throw new CustomError(`${error.name}: ${error.message}`, 500);
    }
  }
}

async function _makePaymentWithMercadopago(appConfig: IAppConfig, apiToken: string, order: any) {
  const paymentResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/payments?access_token=${apiToken}`, order);
  console.log('paymentResponse', paymentResponse.data);

  return paymentResponse.data;
}

// ROUTES
// CLIENTS
server
  .route('/clients')
  .get(getAllClients)
  .post(addClient);

server
  .route('/clients/:id')
  .patch(updateClient);

server
  .route('/clients/:id/contracts')
  .post(addContract);

// AUTH
server
  .route('/auth')
  .post(login);

// CONFIG
server
  .route('/config/:siteId')
  .get(getConfig);

// ERRORS
server
  .route('/errors')
  .post(handleClientErrors);



/* try {
  const mercadopagoUser = await httpClient
                                  .get(
                                    `${appConfig.payments.gateaway.url}/customers/search`,
                                    { params: { email: client.Email } }
                                  );
  console.log('mercadopagoUser', mercadopagoUser)

} catch (error) {

} */

/* async function _sale(contract: any, siteId: string, token: string, res: express.Response) {
  console.log('_addcontract', contract, siteId, token);
  // 1 - Get Amount (MindBody cartCheckout??)
  // 2 - Get Client payment Data:
  //     - If the client has credit card token proceed
  //     - Else, create token (PayU) and proceed
  // 3 - Get Site payment gateAway
  // 4 - Process payment
  //     - If SC needed, get it from ddbb and proceed
  //     - Else, proceed
  // 5 - Response
  //     - If payment Ok: Send sale to MB and return 200 with payment response
  //     - Else, return payment error

  const appConfig = await _getAppConfig(siteId);
  const total = await _getContractTotal(appConfig, contract, siteId, token);
  const clientPaymentData = await _getClientPaymentData(siteId, contract.client.UniqueId);

  if (clientPaymentData) {

  } else {

  }
}

function _getContractTotal(appConfig: any, contract: any, siteId: string, token: string) {
  return Promise.resolve(100);

  // TODO: Finish this (waiting for mindbody answer to how calculate the total with taxes)
  const order = {
    'ClientId': contract.client.UniqueId,
    'Test': true,
    'LocationId': 1,
    'InStore': true,
    'Items': [
       {
        'Item': {
          'Type': 'Service',
          'Metadata': {
            'Id': '123456789'
          }
        },
        'DiscountAmount': 0,
        'Quantity': 1
      },
      {
        'Item': {
          'Type': 'Service',
          'Metadata': {
            'Id': '1364'
          }
        },
        'DiscountAmount': 0,
        'Quantity': 1
      }
    ],
    'Payments': [
      {
        'Type': 'CreditCard',
        'Metadata': {
          'Amount': 238,
          'CreditCardNumber':'4687898983747303',
          'ExpMonth': 6,
          'ExpYear' : 2028,
          'Cvv': 922,
          'BillingName':'Bob Jones',
          'BillingAddress': '4051 Broad Street',
          'BillingCity' : 'San Luis Obispo',
          'BillingState' : 'CA',
          'BillingPostalCode': '93405',
          'SaveInfo': true
        }
      }
    ]
  };

  const requestConfig = {
    url: `${baseUrl}/sale/checkoutshoppingcart`,
    headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
    },
    json: contract,
  };
  console.log('requestConfig', requestConfig)

  request
      .post(
        requestConfig,
        (error, response, body) => res.status(response.statusCode).send(body),
      )
}

function _getClientPaymentData(siteId: string, clientId: string){
    console.log('_getClientPaymentData', siteId, clientId);

    return DDBB.collection('payments')
                .doc(siteId)
                .collection('clients')
                .doc(clientId)
                .get()
                .then(paymentData => {
                  console.log('paymentData', paymentData)
                  return paymentData.data();
                });
}

function _paymentGetAway(paymentUrl: string, quantity: number) {
  // Handle different gateAways
  return Promise.resolve()
} */



// SALE
// server.post('/sale', (req, res) => _sale(req.body.Contract, req.header('siteId'), req.header('Authorization'), res));



/* server.get('/clients', getAllClients);
server.post('/clients', addClient);
server.patch('/clients/:clientId', updateClient); */

// server.get('/clients', (req, res) => _getAllClients(req.body.siteId, req.body.token, res));
/* server.post('/', (req, res) => res.send(Widgets.create()));
server.put('/:id', (req, res) => res.send(Widgets.update(req.params.id, req.body)));
server.delete('/:id', (req, res) => res.send(Widgets.delete(req.params.id)));
server.get('/', (req, res) => res.send(Widgets.list())); */
// server.get('/config/:siteId', (req, res) => res.send(_getConfig(req.params.siteId, req, res)));


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
