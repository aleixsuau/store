/* EXPLANATION

- CONTRACTS
The IContract is a MindBody contract that contains all the items that are going to be charged.
It also constains the periodicity of the charges (Autopays) on its property AutopaySchedule.FrequencyType that
can be:
    - 'SetNumberOfAutopays': set a schedule timing ('OnSaleDate' | 'FirstOfTheMonth' | 'SpecificDate'...)
      and a number of payments (IContract.NumberOfAutopays).
    - 'MonthToMonth': charge every month until the business owner stops it.

Every time a IContract is purchased by a IClient:
  1 - The IClient.Id, date_created and autopays_counter are added to the
      IContract into the DDBB (business/${businessId}/contracts/${contractId}/clients).
  2 - The IOrder is added to the DDBB (business/${businessId}/orders)
  3 - TODO: where do we save the autopay dates into the IClient

After the purchase, the server runs an automatic task every day to:
  1 - Charge the Autopays that are due this day:
      1 - Iterates over all the IContract (business/${businessId}/contracts)
      2 - Checks IContract.AutopaySchedule and if it has to charge the contract today
      3 - Iterates over all IContract.clients
      4 - Checks if there are remaining autopays (business/${businessId}/contracts/${contractId}/clients/${clientID}/autopays_count)
      5 - Processes the payments. If the payment fails, the payment is saved under IOrder.payment_attempts
  2 - Retry the payments of the IOrders that failed
      (if the IAppConfig.payments.number_of_retries has not been exceeded).
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from "body-parser";
import axios from 'axios';
import * as UUID from 'uuid/v4';
import * as moment from 'moment';

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

// TODO: Delete this mock
const contractsMock: IContract[] = [
  {
    Id: '1',
    Name: 'Contract 1 Name',
    Description: 'Contract 1 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Monthly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'FirstOfTheMonth',
    ClientsChargedOnSpecificDate: null,
    DiscountAmount: 0,
    DepositAmount: 0,
    FirstAutopayFree: false,
    LastAutopayFree: false,
    ClientTerminateOnline: false,
    MembershipTypeRestrictions: null,
    LocationPurchaseRestrictionIds: null,
    LocationPurchaseRestrictionNames: null,
    AgreementTerms: 'Agreement Terms',
    RequiresElectronicConfirmation: false,
    AutopayEnabled: true,
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
    TotalContractAmountSubtotal: 960,
    TotalContractAmountTax: 120,
    TotalContractAmountTotal: 1080,
    ContractItems: [
      {
        Id: '1192',
        Name: 'Six Week Bootcamp',
        Description: 'Six Week Bootcamp ContractItem 1 Description',
        Type: 'Service',
        Price: 200,
        Quantity: 1,
        OneTimeItem: false,
      },
      {
        Id: '1364',
        Name: '10 Class Card',
        Description: ' 10 Class Card ContractItem 2 Description',
        Type: 'Service',
        Price: 100,
        Quantity: 1,
        OneTimeItem: false,
      }
    ],
  },
  {
    Id: '2',
    Name: 'Contract 2 Name',
    Description: 'Contract 2 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 2,
      FrequencyTimeUnit: 'Weekly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'FirstOfTheMonth',
    ClientsChargedOnSpecificDate: null,
    DiscountAmount: 0,
    DepositAmount: 0,
    FirstAutopayFree: false,
    LastAutopayFree: false,
    ClientTerminateOnline: false,
    MembershipTypeRestrictions: null,
    LocationPurchaseRestrictionIds: null,
    LocationPurchaseRestrictionNames: null,
    AgreementTerms: 'Agreement Terms',
    RequiresElectronicConfirmation: false,
    AutopayEnabled: true,
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
    TotalContractAmountSubtotal: 960,
    TotalContractAmountTax: 120,
    TotalContractAmountTotal: 1080,
    ContractItems: [
      {
        Id: '1192',
        Name: 'Six Week Bootcamp',
        Description: 'Six Week Bootcamp ContractItem 1 Description',
        Type: 'Service',
        Price: 200,
        Quantity: 2,
        OneTimeItem: false,
      },
      {
        Id: '1364',
        Name: '10 Class Card',
        Description: ' 10 Class Card ContractItem 2 Description',
        Type: 'Service',
        Price: 100,
        Quantity: 1,
        OneTimeItem: false,
      }
    ],
  },
  {
    Id: '3',
    Name: 'Contract 3 Name MonthToMonth',
    Description: 'Contract 3 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'MonthToMonth',
      FrequencyValue: null,
      FrequencyTimeUnit: null,
    },
    IntroOffer: 'None',
    NumberOfAutopays: null,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'FirstOfTheMonth',
    ClientsChargedOnSpecificDate: null,
    DiscountAmount: 0,
    DepositAmount: 0,
    FirstAutopayFree: false,
    LastAutopayFree: false,
    ClientTerminateOnline: false,
    MembershipTypeRestrictions: null,
    LocationPurchaseRestrictionIds: null,
    LocationPurchaseRestrictionNames: null,
    AgreementTerms: 'Agreement Terms',
    RequiresElectronicConfirmation: false,
    AutopayEnabled: true,
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
    TotalContractAmountSubtotal: 960,
    TotalContractAmountTax: 120,
    TotalContractAmountTotal: 1080,
    ContractItems: [
      {
        Id: '1192',
        Name: 'Six Week Bootcamp',
        Description: 'Six Week Bootcamp ContractItem 1 Description',
        Type: 'Service',
        Price: 200,
        Quantity: 1,
        OneTimeItem: false,
      },
      {
        Id: '1364',
        Name: '10 Class Card',
        Description: ' 10 Class Card ContractItem 2 Description',
        Type: 'Service',
        Price: 200,
        Quantity: 1,
        OneTimeItem: false,
      }
    ],
  },
];
const mercadoPagoMessages: {[key: string]: string} = {
  accredited: 'Listo, se acreditó el pago! En el resumen verás el cargo de amount como statement_descriptor',
  pending_contingency: 'Estamos procesando el pago. En menos de 2 días hábiles enviaremos por e-mail el resultado.',
  pending_review_manual: 'Estamos procesando el pago. En menos de 2 días hábiles enviaremos por e-mail el resultado.',
  cc_rejected_bad_filled_card_number:	'Revisa el número de tarjeta',
  cc_rejected_bad_filled_date: 'Revisa la fecha de vencimiento.',
  cc_rejected_bad_filled_other: 'Revisa los datos.',
  cc_rejected_bad_filled_security_code:'Revisa el código de seguridad.',
  cc_rejected_blacklist: 'No pudimos procesar el pago.',
  cc_rejected_call_for_authorize:	'Debes autorizar ante la entidad emisora de su tarjeta el pago de amount a Mercado Pago',
  cc_rejected_card_disabled: 'Llama a la entidad emisora de su tarjeta para que active la tarjeta. El teléfono está al dorso de tu tarjeta.',
  cc_rejected_card_error: 'No pudimos procesar el pago.',
  cc_rejected_duplicated_payment:	'Ya hiciste un pago por ese valor. Si necesitas volver a pagar usa otra tarjeta u otro medio de pago.',
  cc_rejected_high_risk: 'El pago fue rechazado.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_invalid_installments: 'La entidad emisora de la tarjeta no procesa pagos en cuotas.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos permitidos.',
  cc_rejected_other_reason: 'La entidad emisora de la tarjeta no procesó el pago.',
};
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
  const appConfig = await _getAppConfig(siteId);

  req['appConfig'] = appConfig;

  next();
}) */


// UTILS
export async function _getAppConfig(siteId: string): Promise<IAppConfig> {
  console.log('_getAppConfig', siteId);
  if (!siteId) { throw new Error('Please provide an ID'); }

  const businessData = await DDBB.collection('business').doc(siteId).get();

  console.log('businessDataaaaa', businessData.data(), businessData.data().config);

  if (!businessData.exists || !businessData.data() || !businessData.data().config){
    console.log('No App with this ID');
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
  console.log('_handleServerErrors', Object.keys(error), error.code, error.details, error.metadata, error);
  if (error.response) {
    console.log('_handleServerErrors error.response', Object.keys(error.response), error.response.data, error.response);

    const errorResponse: IMindbodyError | any = error.response.data;
    let errorMessage;
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx (Axios httpClient)
    if (errorResponse.error) {
      errorMessage = `${errorResponse.error}: ${errorResponse.cause[0] && errorResponse.cause[0].description || errorResponse.message}`;
    // Mercadopago Error
    } else if (errorResponse.Error) {
      errorMessage = `MindBody Error: ${errorResponse.Error.Code}: ${errorResponse.Error.Message}`;
    }

    res.status(errorResponse.status || error.response.status || 500).json(errorMessage);
  } else if (error.Error) {
    res.status(500).json(error.Error);
    // Firestore Error
  } else if (error.metadata) {
    res.status(500).json(error.metadata);
  } else {
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
    const appConfig = await _getAppConfig(siteId);
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
  if (!siteId ) { res.status(422).json({message: 'SiteId header is missing'});}

  try {
    const appConfig = await _getAppConfig(siteId);
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
    const appConfig = await _getAppConfig(siteId);
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
    _handleServerErrors(error, res);
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
    const appConfig = await _getAppConfig(siteId);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    let paymentsConfig;

    if (isSavingANewCreditCard) {
      paymentsConfig = await _createPaymentsConfig(appConfig, client);
    }

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
    const updatedClientResponse = await httpClient.post(`${baseUrl}/client/updateclient?ClientIds=${clientId}`, updatedClient, config);

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (isSavingANewCreditCard) {
      await DDBB
              .doc(`business/${appConfig.id}/clients/${updatedClientResponse.data.Client.UniqueId}`)
              .update({ payments_config: paymentsConfig });
    }
      res
        .status(updatedClientResponse.status)
        .json(updatedClientResponse.data.Client || updatedClientResponse.statusText);
  } catch (error) {
    _handleServerErrors(error, res);
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
    // Order the contract
    const contractOrder = await _processOneContractOrder(contract, clientId, appConfig, token);

    // Only save the order when it succeeds (because this is the contract
    // subscription not an Autopay).
    if (contractOrder.payment_status === 'approved') {
      // Save the order to the DDBB
      await _saveOrderToDDBB(contractOrder, contract.Id, clientId, appConfig.id);
      // Add the client to the contract
      const contractClientInfo = {
        Id: clientId,
        date_created: contractOrder.date_created_timestamp.toISOString(),
        // TODO: Check if the contract already starts minus the firsy autopay (ie: 1 year = 11 autopays)
        autopays_counter: --contract.NumberOfAutopays,
      }
      await DDBB
              .collection(`business/${appConfig.id}/contracts/${contract.Id}/clients`)
              .doc(clientId)
              .set(contractClientInfo);

      res.status(200).json(contractOrder);
    } else {
      throw new CustomError(`Mercadopago ${ contractOrder.payment_status ? `: ${mercadoPagoMessages[contractOrder.payment_status_detail]} ` : ''}`, 400);
    }
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function _getPaymentsConfig(appConfig: IAppConfig, clientId: string): Promise<IClientPaymentsConfig | null> {
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
        name: appConfig.test && appConfig.payments.gateaway.name === 'mercadopago' ?
                appConfig.payments.gateaway.test_payment_response :
                `${client.FirstName} ${client.LastName}`,
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
    }

    // Associate the creditCardTokenId to a user (required by Mercadopago)
    const card = {
      token: creditCardTokenId,
    }

    const newCardResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/customers/${clientId}/cards?access_token=${apiToken}`, card);
    const cardId = newCardResponse.data.id;

    // If the user already had a Credit Card, remove it after
    // saving the new one (we only allow one credit card per client)
    if (clientPaymentsConfig && clientPaymentsConfig.clientId) {
      await httpClient.delete(`${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
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
      const errorMessage = `${errorResponse.error}: ${errorResponse.cause[0] && errorResponse.cause[0].description || errorResponse.message}`;

      console.log('_getMercadopagoPaymentsConfig ERROR1:', errorResponse, errorMessage, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      throw new CustomError(errorMessage, errorResponse.status);
    } else {
      throw new CustomError(`${error.name}: ${error.message}`, 500);
    }
  }
}

async function _makePaymentWithMercadopago(contract: IContract, appConfig: IAppConfig, clientPaymentConfig: IClientPaymentsConfig): Promise<IPayment> {
  const paymentsApiToken = appConfig.test ? appConfig.payments.gateaway.apiToken.test : appConfig.payments.gateaway.apiToken.production;
  const paymentsApiKey = appConfig.test ? appConfig.payments.gateaway.apiKey.test : appConfig.payments.gateaway.apiKey.production;
  const cardTokenResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/card_tokens?public_key=${paymentsApiKey}`, { card_id: clientPaymentConfig.cardId, security_code: clientPaymentConfig.CVV })
  const cardToken = cardTokenResponse.data.id;
  // TODO: Cover the cases when the order is the first or last
  const mercadopagoOrder = {
    transaction_amount: contract.RecurringPaymentAmountTotal,
    token: cardToken,
    description: contract.Description,
    installments: 1,
    payer: {
      id: clientPaymentConfig.clientId,
    }
  };
  console.log('mercadopagoOrder 1: ', mercadopagoOrder, paymentsApiToken)
  const paymentResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/payments?access_token=${paymentsApiToken}`, mercadopagoOrder);
  console.log('mercadopagoPaymentResponse 1', paymentResponse.data);

  return paymentResponse.data as IPayment;
}

/* function _getAutopayDates(contract: IContract, date_created: string) {
  if (contract.AutopaySchedule.FrequencyType === 'MonthToMonth') { return []; }

  const autopays = contract.NumberOfAutopays;
  let autopaysCounter = contract.NumberOfAutopays;
  const firstAutopay = moment(date_created).startOf('day');
  let autopayDates = [firstAutopay];
  const FrequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                              'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                              'months' : 'years';

  while(autopaysCounter--) {
    const previousAutopayDate = autopayDates[autopays - autopaysCounter - 1];
    const nextAutopayDate = previousAutopayDate.clone().add(contract.AutopaySchedule.FrequencyValue, FrequencyTimeUnit);

    autopayDates = [...autopayDates, nextAutopayDate];
  }

  const autopayDateStrings = autopayDates.map(autopayDate => autopayDate.toISOString());
  const autopayDatesFormatted: IAutopay[] = autopayDateStrings.map(autopayDate => {
                                const autopayDateFormatted: IAutopay = {
                                  status: null,
                                  payment_attempts: [],
                                };

                                return autopayDateFormatted;
                              })
  console.log('autopayDateStrings', autopayDateStrings);

  return autopayDatesFormatted;
} */

async function getOrders(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const limit = req.query.limit || 1000;
  const offset = req.query.offset || 0;
  const client = req.query.client;
  const contract = req.query.contract;
  const status = req.query.status;
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  console.log('getOrders', siteId, token, limit, offset, client, contract, typeof contract, status, dateFrom, dateTo);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);
    // Check Auth, if not it throws
    await _checkMindbodyAuth(appConfig.apiKey, siteId, token);

    let collectionRef = DDBB.collection(`business/${siteId}/orders`).orderBy('date_created_timestamp');

    if (client) {
      collectionRef = collectionRef.where('client_id', '==', client);
    }

    if (contract) {
      collectionRef = collectionRef.where('contract_id', '==', contract);
    }

    if (status) {
      collectionRef = collectionRef.where('payment_status', '==', status);
    }

    if (dateFrom) {
      const dateFromDate = new Date(dateFrom);

      collectionRef = collectionRef.where('date_created_timestamp', '>=', dateFromDate);
    }

    if (dateTo) {
      // Set end of the day
      const dateToDate = new Date(dateTo).setHours(23, 59, 59, 999);
      const dateToDateEndOfTheDay = new Date(dateToDate);

      collectionRef = collectionRef.where('date_created_timestamp', '<=', dateToDateEndOfTheDay);
    }

    const filteredPaymentsSnapshot = await collectionRef.limit(limit).offset(offset).get();
    const filteredPayments = filteredPaymentsSnapshot.docs.map(snapshot => snapshot.data());

    res.status(200).json(filteredPayments);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function _checkMindbodyAuth(apiKey: string, siteId: string, token: string) {
  console.log('_checkMindbodyAuth', apiKey, siteId, token);
  const config = {
    headers: {
    'Api-Key': apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };
  const url = `${baseUrl}/sale/giftcards`;
  // Make a call just to validate that the user is authenticated on Mindbody
  try {
    await httpClient.get(url, config);
    return true;
  } catch (error) {
    throw new CustomError('Unauthenticated user', 401);
  }
}

async function refundPayment(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const orderId = req.params.id;
  console.log('getOrders', siteId, token, orderId);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);
    const apiToken = appConfig.test ? appConfig.payments.gateaway.apiToken.test : appConfig.payments.gateaway.apiToken.production;
    const orderResponse = await DDBB.doc(`business/${siteId}/orders/${orderId}`).get();
    const orderPaymentAttempts = orderResponse.data().payment_attempts;
    console.log('orderPaymentAttempts', orderPaymentAttempts, orderPaymentAttempts[orderPaymentAttempts.length - 1])
    const paymentId = orderPaymentAttempts[orderPaymentAttempts.length - 1].id;
    const refundPaymentResponse = await httpClient.post(`${appConfig.payments.gateaway.url}/payments/${paymentId}/refunds?access_token=${apiToken}`);
    const refundedPayment = refundPaymentResponse.data;
    console.log('refundedPayment', refundedPayment);

    // Update order status on Firebase DDBB
    await DDBB.doc(`business/${siteId}/orders/${orderId}`).update({ payment_status: 'refunded' });

    res.status(200).json(refundedPayment);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function _saveOrderToDDBB(order: IOrder, contractId: string, clientId: string, appId: string) {
  // Save the order into orders under the Id of the order (UUID)
  return DDBB
            .collection(`business/${appId}/orders`)
            .doc(`${order.id}`)
            .set(order);

  // Save it into the Client too
  /* await DDBB
          .collection(`business/${appId}/clients/${clientId}/contracts/${contractId}`)
          .doc(`${order.id}`)
          .set(order);
  */
}

async function getContracts(req: express.Request, res: express.Response) {
  // TODO: Replace this mock with the call to MindBody
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('getContracts', siteId, token);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    // const appConfig = await _getAppConfig(siteId);

    res.status(200).json(contractsMock);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function processAllAppsAutopays(req: express.Request, res: express.Response) {
  // TODO: Fire this function for every app
  const apps = await DDBB.collection(`business`).get();
  const appsArray = apps.docs.map(snapshot => snapshot.data());
  console.log('processAllAppsAutopays appsArray', appsArray);

  for (let i = 0; i < appsArray.length; i++) {
    let appConfig;
    try {
      const siteId = appsArray[i].config.id;
      appConfig = await _getAppConfig(siteId);
      console.log('_processOneAppAutopays', appConfig);

      await _processOneAppAutopays(appConfig);
    } catch (error) {
      console.log('processAllAppsAutopays error', error);
      const appAutoPaysProcessingError = {
        error: error,
        date_created: new Date(),
      };
      // Save the error to the DDBB
      const appAutoPaysProcessingErrorResponse = await DDBB.collection(`business/${appConfig.id}/autopay_errors`).add(appAutoPaysProcessingError);
      console.log('appAutoPaysProcessingErrorResponse', appAutoPaysProcessingErrorResponse)
      // TODO: Email me
    }
  }
}

async function _processOneAppAutopays(appConfig: IAppConfig) {
  // TODO: Replace this test Auth call with the admin client account data (username and password)
  // created for us to manage autopays
  const url = `${baseUrl}/usertoken/issue`;
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': appConfig.id,
    }
  };
  const tokenRequest = {
    Username: 'Siteowner',
    Password: 'apitest1234',
  };

  const tokenResponse = await httpClient.post(url, tokenRequest, config);
  const token = tokenResponse.data.AccessToken;
  // TODO: Replace this with the call to Mindbody
  const appContracts = contractsMock;

  // Process All the app contracts
  for (let i = 0; i < appContracts.length; i++) {
    const contract = appContracts[i];

    if (isTodayTheContractsChargeDay(contract)) {
      try {
        await _processAllContractOrders(contract, appConfig, token);
      } catch (error) {
        console.log('_processOneAppAutopays error', error);
        throw new CustomError(`_processOneAppAutopays error: ${JSON.stringify(error)}`, 500);
      }
    }
  }

  // Retry all failed orders
  try {
    await _processFailedContractOrders(contractsMock, appConfig, token);
  } catch (error) {
    console.log('_processFailedContractOrders', error);
  }
}

async function _processAllContractOrders(contract: IContract, appConfig: IAppConfig, token: string) {
  console.log('_processAllContractOrders', contract, appConfig);
  const contractClientsResponse = await DDBB.collection(`business/${appConfig.id}/contracts/${contract.Id}/clients`).get();
  const contractClients = contractClientsResponse.docs.map(snapshot => snapshot.data());

  for (let i = 0; i < contractClients.length; i++) {
    const currentClient = contractClients[i];
    console.log('CURRENT CLIENT: ', i, currentClient);

    try {
      // Order the contract
      const contractOrder = await _processOneContractOrder(contract, currentClient.Id, appConfig, token);
      console.log('CONTRACT ORDER', i, contractOrder)

      // Save the order to the DDBB
      await _saveOrderToDDBB(contractOrder, contract.Id, currentClient.Id, appConfig.id);

    } catch (error) {
      const order: IOrder = {
        id: UUID(),
        date_created: new Date().toISOString(),
        date_created_timestamp: new Date(),
        client_id: currentClient.Id,
        contract_id: contract.Id,
        shopping_cart: null,
        payment_status: 'error',
        payment_status_detail: JSON.stringify(error.response || error.message || error),
        payment_attempts: [{ error: JSON.stringify(error.response || error.message || error) }],
      }

      console.log('_processAllContractOrders ERROR', error.message, order);

      await _saveOrderToDDBB(order, contract.Id, currentClient.Id, appConfig.id);
    }
  }
}

async function _processOneContractOrder(contract: IContract, clientId: string, appConfig: IAppConfig, token: string): Promise<IOrder> {
  console.log('_processOneContractOrder', contract, clientId, appConfig, token);
  // TODO: add IContract.FirstAutopayFree and IContract.LastAutopayFree
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
  const MBHeadersConfig = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': appConfig.id,
    'Authorization': token,
    }
  };

  const clientPaymentConfig = await _getPaymentsConfig(appConfig, clientId);
  let order: IOrder = {
    id: UUID(),
    date_created: new Date().toISOString(),
    date_created_timestamp: new Date(),
    client_id: clientId,
    contract_id: contract.Id,
    shopping_cart: null,
    payment_status: null,
    payment_status_detail: null,
    payment_attempts: [],
  }

  if (clientPaymentConfig) {
    const mindBodyCartOrder = {
      ClientId: clientId,
      Test: appConfig.test,
      Items: contractItems,
      Payments: [
        {
          Type: 'Cash',
          Metadata: {
            Amount: contract.FirstPaymentAmountTotal,
          }
        }
      ]
    };

    if (appConfig.payments.gateaway.name === 'mercadopago') {
      const paymentResponse: IPayment = await _makePaymentWithMercadopago(contract, appConfig, clientPaymentConfig);

      order = {
        ...order,
        payment_status: paymentResponse.status,
        payment_status_detail: paymentResponse.status_detail,
        payment_attempts: [paymentResponse],
      }

      if (paymentResponse.status === 'approved') {
        const cartResponse = await httpClient.post(`${baseUrl}/sale/checkoutshoppingcart`, { ...mindBodyCartOrder, Test: false }, MBHeadersConfig);
        order = {
          ...order,
          // TODO: Do we need to save the shopping_cart???
          shopping_cart: cartResponse.data.ShoppingCart,
        }
      }

      console.log('_processOneContractOrder order:', order);

      return order;
    } else {
      throw new CustomError('This site does not have a Orders Gateaway associated', 400);
    }
  } else {
    throw new CustomError('This client does not have a Credit Card associated', 400);
  }
}

async function _processFailedContractOrders(contractsCatalog: IContract[], appConfig: IAppConfig, token: string) {
  console.log('_processFailedContractOrders appConfig', appConfig)
  const appOrders = await DDBB.collection(`business/${appConfig.id}/orders`).get();
  const appOrdersArray = appOrders.docs.map(snapshot => snapshot.data());
  console.log('appOrdersArray', appOrdersArray)
  // Cancelled orders are the ones that have finished the max number
  // of retries (appConfig.payments.number_of_retries;)
  const failedOrders = appOrdersArray.filter(order => order.payment_status !== 'approved' && order.payment_status !== 'cancelled');
  console.log('failedOrders', failedOrders);

  for (let i = 0; i < failedOrders.length; i++) {
    const failedOrder = failedOrders[i];
    const maxRetries = appConfig.payments.number_of_retries;
    let actualRetries = failedOrder.payment_attempts.length;
    console.log('failedOrder', failedOrder, maxRetries, actualRetries);
    const failedContract = contractsCatalog.find(contract => contract.Id === failedOrder.contract_id);
    console.log('failedContract', failedContract);

    try {
      const newContractOrder = await _processOneContractOrder(failedContract, failedOrder.client_id, appConfig, token);
      console.log('CONTRACT ORDER', i, newContractOrder);

      const contractOrderUpdate = {
        date_created_timestamp: newContractOrder.payment_status === 'approved' ? new Date() : failedOrder.date_created_timestamp,
        payment_status: maxRetries === ++actualRetries ? 'cancelled' : newContractOrder.payment_status,
        payment_status_detail: newContractOrder.payment_status_detail,
        payment_attempts: [...failedOrder.payment_attempts, ...newContractOrder.payment_attempts],
      }

      // Update the IContract order with the new payment attempt
      await DDBB.doc(`business/${appConfig.id}/orders/${failedOrder.id}`).update(contractOrderUpdate);

      // Update the client's autopays_counter
      const currentAutopayCounterResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`).get();
      const currentAutopayCounter = currentAutopayCounterResponse.data().autopays_counter;
      await DDBB.doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`).update({autopays_counter: currentAutopayCounter + 1 });

      console.log('contractOrderUpdate', contractOrderUpdate);
    } catch (error) {
      const contractOrderUpdate = {
        payment_status: maxRetries === ++actualRetries ? 'cancelled' : 'error',
        payment_status_detail: JSON.stringify(error.response || error.message || error),
        payment_attempts: [...failedOrder.payment_attempts, { error: JSON.stringify(error.response || error.message || error) }],
      }

      await DDBB.doc(`business/${appConfig.id}/orders/${failedOrder.id}`).update(contractOrderUpdate);
      console.log('_processFailedContractOrders ERROR', error.message, contractOrderUpdate);
    }
  }
}

function isTodayTheContractsChargeDay(contract: IContract): boolean {
  // TODO: Remove this mock
  return true;

  const today = moment().date();
  let dayToCharge;

  // TODO: Cover client specific charge dates (OnSaleDate | SpecificDate)
  // Now we are looking at the IContract ClientsChargedOn date and we charge
  // to every client on the same date. When IContract.ClientsChargedOn is
  // OnSaleDate or SpecificDate, we should:
  //    1 - Calculate the date for every IClient when the IContract is purchased
  //    2 - Set it on the IClientContract (business/${businessId}/contracts/${contractId}/clients/)
  //    3 - Iterate over every IClientContract and charge it only if today === day_to_charge

  switch (contract.ClientsChargedOn) {
    case 'FirstOfTheMonth':
      dayToCharge = 1;
      break;

    case 'FifteenthOfTheMonth':
      dayToCharge = 15;

    case 'LastDayOfTheMonth':
      dayToCharge = moment().endOf('month');

    case 'FirstOrFifteenthOfTheMonth':
      dayToCharge = 15;

    case 'FirstOrSixteenthOfTheMonth':
      dayToCharge = 16;

    case 'FifteenthOrEndOfTheMonth':
      dayToCharge = 15;

    case 'OnSaleDate':
      dayToCharge = 1;

    case 'SpecificDate':
      dayToCharge = 1;

    default:
      dayToCharge = 1;
  }

  console.log('isTodayTheContractsChargeDay', today, dayToCharge, today === dayToCharge);
  return today === dayToCharge;
}

// ROUTES
// ERRORS
server
  .route('/errors')
  .post(handleClientErrors);

// AUTH
server
  .route('/auth')
  .post(login);

// CONFIG
server
  .route('/config/:siteId')
  .get(getConfig);

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

// ORDERS
server
  .route('/orders')
  .get(getOrders);

server
  .route('/orders/:id/refund')
  .post(refundPayment);

server
  .route('/payments/runautopays')
  .post(processAllAppsAutopays);

// CONTRACTS
server
  .route('/contracts')
  .get(getContracts);

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);

exports.scheduledFunction = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
  console.log('5 MINUTES: This will be run every 5 minutes!');
});


