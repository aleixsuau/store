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
export async function _getAppConfig(siteId: string, res?: express.Response): Promise<IAppConfig> {
  console.log('_getAppConfig', siteId);
  if (!siteId) { throw new Error('Please provide an ID'); }

  const businessData = await DDBB.collection('business').doc(siteId).get();

  console.log('businessDataaaaa', businessData.data(), businessData.data().config);

  if (!businessData.exists || !businessData.data() || !businessData.data().config){
    console.log('No App with this ID');
    res.status(404).json({code: 404, message: 'No App with this ID'});
    return null;
  } else {
    return businessData.data().config as IAppConfig;
  }
}

function handleClientErrors(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('handleClientErrors', siteId, token, req.body);
  res.status(200).json({message: 'Error received'});
}

function _handleServerErrors(error: any, res: express.Response) {
  if (error.response) {
    console.log('_handleServerErrors', error.response);
    const errorResponse: IMindbodyError = error.response.data;
    res.status(error.response.status).json(`MindBody Error: ${errorResponse.Error.Code}, ${errorResponse.Error.Message}`);
  } else {
    console.log('_handleServerErrors', error);
    res.status(error.code || 500).json(`${error.name || error.code}: ${error.message}`);
  }
}


// ROUTE HANDLERS
function getConfig(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;

  _getAppConfig(siteId)
    .then(appConfig => {
      // Keep apiKey private
      const {apiKey, ...appConfigCopy} = appConfig;
      res.status(200).json(appConfigCopy);
    })
    .catch(error => res.status(500).json(error));
}

async function login(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const username = req.body.username;
  const password = req.body.password;
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

    const tokenResponse = await httpClient.post(url, tokenRequest, config);

    res.status(tokenResponse.status).json(tokenResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function getAllClients(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const searchText = req.query.SearchText;
  const limit = req.query.limit;
  const offset = req.query.offset;
  console.log('_getAllClients', siteId, token, limit, offset, searchText, `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`);

  if (!token) { res.status(401).json({message: 'Unauthorized'});}
  if (!siteId ) { res.status(422).json({message: 'SiteId param is missing'});}

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

    res.status(clientsResponse.status).json(clientsResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function addClient(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

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
      console.log('paymentsConfig', `business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`, paymentsConfig)
      await DDBB
              .doc(`business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`)
              .set({ payments_config: paymentsConfig });
    }
    console.log('newClient', Object.keys(newClientResponse), newClientResponse.data)
      res
        .status(newClientResponse.status)
        .json(newClientResponse.data.Client || newClientResponse.statusText);
  } catch (error) {
    console.log('catch', error, Object.keys(error));
    res.status(error.code).json(error.message);
  }
}

async function updateClient(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

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
              .doc(`business/${appConfig.id}/clients/${updatedClientResponse.data.Client.UniqueId}`)
              .update({ payments_config: paymentsConfig });
    }
    console.log('updatedClientResponse: ', Object.keys(updatedClientResponse), updatedClientResponse.data)
      res
        .status(updatedClientResponse.status)
        .json(updatedClientResponse.data.Client || updatedClientResponse.statusText);
  } catch (error) {
    console.log('updatedClient catch', error.response, error.code, error.message, Object.keys(error), error.response, error.toJSON);
    res.status(error.code).json(error.message);
  }
}

async function addContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contract: IContract = req.body;
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
    // TODO: IMPORTANT: Price/OnlinePrice
    const servicesCatalogResponse = await httpClient.get(`${baseUrl}/sale/services`, config);
    const servicesCatalog: IService[] = servicesCatalogResponse.data.Services;
    console.log('servicesCatalog', servicesCatalog);
    const contractItems = contract.ContractItems.map(contractItem => {
      const formattedItem = {
        Item: {
          Type: contractItem.Type,
          Metadata: {
            Id: contractItem.Id,
          }
        },
        // TODO: Add discount management
        DiscountAmount: 0,
        Quantity: contractItem.Quantity,
      }

      return formattedItem;
    });

    console.log('contractItems', contractItems);

    const contractAmount = contract.ContractItems.reduce((result, contractItem) => {
      let subTotal = contractItem.Price * contractItem.Quantity;
      // TODO: Add products coverage to contracts? (A contract can include products?)
      const serviceDetails = servicesCatalog.find(service => service.Id === contractItem.Id);
      if (serviceDetails) {
        const taxRate = serviceDetails.TaxRate;
        subTotal += (subTotal * taxRate);
      }

      return result + subTotal;
    }, 0);
    console.log('contractAmount', contractAmount);

    const cartOrder = {
      ClientId: clientId,
      Test: appConfig.test,
      Items: contractItems,
      Payments: [
        {
          Type: 'Cash',
          Metadata: {
            // TODO: contract.FirstPaymentAmountTotal instead of this calculation??
            Amount: contractAmount,
          }
        }
      ]
    };
    console.log('cartOrder', cartOrder)
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
          }
        };
        console.log('mercadopagoOrder: ', mercadopagoOrder, paymentsApiToken)

        const paymentResponse: IMercadoPagoPayment = await _makePaymentWithMercadopago(appConfig, paymentsApiToken, mercadopagoOrder);
        console.log('paymentResponse', paymentResponse);
        // Save the payment to Firebase under the Id of the payment
        // with the id of the MindBody client (to query per client)
        const paymentToSave = {
          ...paymentResponse,
          date_created: new Date(paymentResponse.date_created),
          mindBodyId: clientId
        };
        await DDBB
                .collection(`business/${appConfig.id}/payments`)
                .doc(`${paymentToSave.id}`)
                .set(paymentToSave);

        if (paymentToSave.status === 'approved') {
          const cartResponse = await httpClient.post(`${baseUrl}/sale/checkoutshoppingcart`, { ...cartOrder, Test: false }, config);
          console.log('cartResponse', cartResponse.data)
          // TODO: Save contract into Firebase DDBB in order to charge it every X time
          await DDBB
                  .collection(`business/${appConfig.id}/clients/${clientId}/contracts`)
                  .add(contract);

          res.status(200).json('Payment Done!');
        } else {
          throw new CustomError(`Mercadopago ${ paymentToSave.status ? ': ' + paymentToSave.status : ''}`, 400);
        }
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
      let errorMessage;
      console.log('_getMercadopagoPaymentsConfig ERROR1:', errorResponse, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      if (errorResponse.error) {
        errorMessage = `${errorResponse.error}: ${errorResponse.cause[0] && errorResponse.cause[0].description || errorResponse.message}`;
      // Mercadopago Error
      } else if (errorResponse.Error) {
        errorMessage = `${errorResponse.Error.Code}: ${errorResponse.Error.Message}`;
      }

      res.status(errorResponse.status || 500).json(errorMessage);
    } else {
      res.status(error.code || 500).json(`${error.name}: ${error.message}`);
    }
  }
}

async function _getPaymentsConfig(appConfig: IAppConfig, clientId: number): Promise<IClientPaymentsConfig | null> {
  console.log('_getPaymentsConfig', appConfig, clientId);
  const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
  const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IClientPaymentsConfig | null;
  console.log('clientPaymentsConfig', clientPaymentsConfig);

  return clientPaymentsConfig;
}

async function _createPaymentsConfig(appConfig: IAppConfig, client: IClient): Promise<IClientPaymentsConfig> | null {
  console.log('_createPaymentsConfig', appConfig, client, client.Id);

  const clientPaymentsConfig = await _getPaymentsConfig(appConfig, client.Id);

  // If the user comes with a CVV inside the credit card data, then
  // he is creating a new Credit Card (MindBody doesn't save CVV)
  // If the user already has a CrediCard, pass its data to update
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
      const clientResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/customers?access_token=${apiToken}`, clientData);
      clientId = clientResponse.data.id;
      console.log('clientResponse', clientResponse.data);
    }

    // Associate the creditCardTokenId to a user (required by Mercadopago)
    const card = {
      token: creditCardTokenId,
    }

    const newCardResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/customers/${clientId}/cards?access_token=${apiToken}`, card);
    const cardId = newCardResponse.data.id;
    console.log('newCardResponse', cardId, newCardResponse.data)

    // If the user already had a Credit Card, remove it after
    // saving the new one (we only allow one credit card per client)
    if (clientPaymentsConfig && clientPaymentsConfig.clientId) {
      console.log('Delete url:', `${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      const deleteCardResponse = await httpClient.delete(`${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      console.log('deleteCardResponse', deleteCardResponse);
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

async function _makePaymentWithMercadopago(appConfig: IAppConfig, apiToken: string, order: any): Promise<IMercadoPagoPayment> {
  const paymentResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/payments?access_token=${apiToken}`, order);
  console.log('paymentResponse', paymentResponse.data);

  return paymentResponse.data as IMercadoPagoPayment;
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

/*
QUERY BY DATE
  let start = new Date('2017-01-01');
  let end = new Date('2018-01-01');

  // ORDERBY???

  this.afs.collection('invoices', ref => ref
      .where('dueDate', '>', start)
      .where('dueDate', '<', end)
  );
*/






// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);




