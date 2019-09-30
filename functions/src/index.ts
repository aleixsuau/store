/* EXPLANATION

- This project relies on MindBody:
  - IContract:
    The IContract is a MindBody contract that contains all the items that are going to be charged.
    It also constains the periodicity of the charges (Autopays) on its property AutopaySchedule.FrequencyType that
    can be:
        - 'SetNumberOfAutopays': set a schedule timing ('OnSaleDate' | 'FirstOfTheMonth' | 'SpecificDate'...)
          and a number of payments (IContract.NumberOfAutopays).
        - 'MonthToMonth': charge every month until the business owner stops it.

    * IContracts can only be created/updated/deleted on MindBody
    * We use IContracts to show/search all the contracts available and their details throught their Id
    * A IMindBroClientContract represent a collection of IOrders to be done in the future. autopays_counter
      (if IContractAutopaySchedule.FrequencyType === 'SetNumberOfAutopays') determines wether there are
      remaining autopays to be done.
    * We use IMindBroClientContracts (on our Firebase DDBB) to keep track of orders, billing and autopays related to a
      IContract Id purchased by a IClient.

  - IClient:
    The IClient is a MindBody client that contains all the client data.

    * IClients can be created/updated either on Mindbody or MindBro. They can be deleted only on MindBody.
    * We use IClients to show/search all the clients available and their details throught their Id.
    * We use IMindBroClients (on our Firebase DDBB) to keep track of the client payments_config and the
      contracts associated to ther IClient id.

  - Autopay:
    An autopay is a recurrent payment that the IClient agrees when a IContract is purchased. The autopays follow
    the IContract periodicity ()


- BILLING & AUTOPAYS
Every time a IContract is purchased by a IClient:
  1 - The IMindBroClientContract data (date_created, status, autopay_counter, id...) is added to the IContract
      into the DDBB (business/${businessId}/contracts/${contractId}/clients/${client.Id}) under the IClient.Id.
  2 - The IContract (id and date_created) is added to the IClient (business/${businessId}/clients/${clientId}/contracts/${contractId})
  3 - If the IContract is paid ('Instant' payment or 'FirstAutopayFree'...) the IOrder is added to the DDBB (business/${businessId}/orders)

The server runs an automatic task every day to:
  1 - Charge the Autopays that are due this day:
      1 - Iterates over all the IContract (business/${businessId}/contracts)
      2 - Iterates over all IContract.clients and if
          1 - IContract.status is 'active', 'activation_pending' or 'payment_pending' for the client
          2 - _isTodayTheAutopayDay
          Continues
      3 - Processes the payments.
          - If the payment fails, the payment is saved under IOrder.payment_attempts
          - If IContract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays' &&
            IContract.autopays_counter === 0 &&
            contract.ActionUponCompletionOfAutopays !== 'ContractAutomaticallyRenews'
            sets the IContract.status to 'terminated'.

  2 - Retry the payments of the IOrders that failed
      (if the IAppConfig.payments.number_of_retries has not been exceeded).


  CONTRACTS PURCHASE
  When we purchase a contract we can specify two options:
  StartDate: The date that the contract starts (Default: Contract.clientsChargeOn)
  FirstPaymentOccurs: The date on which the first payment is to occur. Possible values: Instant || StartDate

  - If FirstPaymentOccurs == ‘Instant’, the first charge is done with the purchase but the IContract items
    won't be delivered until the IContract.ClientsChargeOn date.
    1 - The IMindBroClientContract data (date_created, status, autopay_counter, id...) is added to the IContract
      into the DDBB (business/${businessId}/contracts/${contractId}/clients/${client.Id}) under the IClient.Id with
      the status 'activation_pending'.
    2 - The IContract (id and date_created) is added to the IClient (business/${businessId}/clients/${clientId}/contracts/${contractId})

  - If FirstPaymentOccurs == ‘StartDate’, the first charge is done on the specified ‘StartDate’ (following the IContract.ClientsChargeOn)
    and The IMindBroClientContract is added to the DDBB with the status 'payment_pending'.

  * ‘StartDate’ must be the same than the Contract.clientsChargeOn (‘firstOfTheMonth...’) if not it throws error, this is
    Contract.clientsChargeOn determines the StartDate (Contract.clientsChargeOn === StartDate).
  * If FirstPaymentOccurs === ‘Instant’ and Contract.clientsChargeOn states another day, the first charge is done with the
    purchase and the rest is done following the contract.AutopaySchedule calculated based on the Contract.clientsChargeOn.

  CONTRACT STATUSES:
  1 - activation_pending:
      The IClient purchases a IContract and pays 'Instant' but the IContract is activated depending on:
      1 - Default ClientsChargeOn (startDate): the first IContract.ClientsChargeOn date match (FirstOfTheMonth...).
      2 - Custom ClientsChargeOn (startDate): the date that admin user chose when it made the purchase (it needs to
        follow the IContract.ClientsChargedOn ()).

      * When the ClientsChargeOn date arrives, the IOrder is made and sent to Mindbody, so the IClient is able to
      start using the gym.

  2 - payment_pending:
      The IClient purchases a IContract but he/she has not paid the current Autopay.
      This status responds to two cases:
      1 - The payment of the purchase was not 'Instant', so the payment will take place on the IContract.ClientsChargeOn
          (custom or default).
      2 - The last IContract's autopay failed.

  3 - active:
      The IClient has purchased a IContract, has pait it and the it has been activated, this is, the IContract.ClientsChargeOn
      date has happend.

  4 - paused:
      The IClient has taken a break (summer holidays...)

  5 - paused_no_payment:
      The IClient has exceed the max number of retries (appConfig.payments.number_of_retries)
      in the last autopay.

  6 - canceled:
      The IContract has been cancelled by an admin user.

  7 - terminated:
      The IContract ended (the NumberOfAutopays finished).
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import axios from 'axios';
import * as UUID from 'uuid/v4';
import * as moment from 'moment';

export class CustomError extends Error {
  code: number;
  date: string;

  constructor(
    message: string,
    code: number) {
      super(message);
      this.code = code;
      this.date = new Date().toISOString();
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
    Name: 'Contract 1: Every 1 Month | FirstOfTheMonth',
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
    Name: 'Contract 2: Every 1 Week | FifteenthOfTheMonth',
    Description: 'Contract 2 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Weekly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'FifteenthOfTheMonth',
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
    Id: '3',
    Name: 'Contract 3: Every 1 Year | LastDayOfTheMonth',
    Description: 'Contract 3 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Yearly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'LastDayOfTheMonth',
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
    Id: '4',
    Name: 'Contract 4: Every 1 Week | OnSaleDate',
    Description: 'Contract 4 Description',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Weekly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 5,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'OnSaleDate',
    ClientsChargedOnSpecificDate: '2019-09-25T15:35:23.983Z',
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

  console.log('businessDataaaaa', businessData.data());

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


// ROUTE HANDLERS
// CONFIG
function getConfig(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;

  _getAppConfig(siteId)
    .then(appConfig => {
      if (!appConfig) {
        res.status(404).json('No app with this id');
      }
      // Keep apiKey private
      const {customization, id, queryLimit, test} = appConfig;
      res.status(200).json({customization, id, queryLimit, test});
    })
    .catch(error => res.status(500).json(error));
}

async function updateConfig(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;
  const todayTestMock = moment(req.body).toISOString();
  console.log('updateConfig', siteId, todayTestMock);

  try {
    await DDBB.collection('business').doc(siteId).update({'config.today_test_mock': todayTestMock});
    res.status(200).json(todayTestMock);
  } catch (error) {
    res.status(500).json(error);
  }
}

// AUTH
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

// CLIENTS

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

  const client: IClient = {
    ...req.body.Client,
    date_created: new Date(),
  };
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
    let clientToSave: IMindBroClient = {
      contracts: {},
      payments_config: null,
    }

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (paymentsConfig) {
      console.log('paymentsConfig', `business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`, paymentsConfig)
      clientToSave = {
        ...clientToSave,
        payments_config: paymentsConfig,
      }
    }

    await DDBB
            .doc(`business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`)
            .set(clientToSave);

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
    const isDeletingCard = client.ClientCreditCard && !client.ClientCreditCard.CardNumber;
    let paymentsConfig: IMindBroClientPaymentsConfig = null;

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

    if (isDeletingCard) {
      if (appConfig.payments.gateaway.name === 'mercadopago') {
        const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
        const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
        const apiToken = appConfig.test ? appConfig.payments.gateaway.apiToken.test : appConfig.payments.gateaway.apiToken.production;

        await httpClient.delete(`${appConfig.payments.gateaway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      }

      await DDBB
              .doc(`business/${appConfig.id}/clients/${updatedClientResponse.data.Client.UniqueId}`)
              .update({
                'payments_config.CVV': null,
                'payments_config.cardId': null,
                'payments_config.cardToken': null,
              });
    }

    res
      .status(updatedClientResponse.status)
      .json(updatedClientResponse.data.Client || updatedClientResponse.statusText);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function getClientContracts(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const clientId = req.params.id;

  console.log('getClientContracts', siteId, clientId)

  try {
    const clientContractsResponse = await DDBB.doc(`business/${siteId}/clients/${clientId}`).get();
    console.log('clientContractsResponse', clientContractsResponse.data());
    const clientContracts = Object.values(clientContractsResponse.data().contracts).map((clientContract: any) => clientContract.Id);
    let clientContractsData: IMindBroClientContract[] = [];
    console.log('clientContracts', clientContracts);

    if (clientContracts) {
      for (let i = 0; i < clientContracts.length; i++) {
        const currentContractId = clientContracts[i];
        const currentContractDataResponse = await DDBB.doc(`business/${siteId}/contracts/${currentContractId}/clients/${clientId}`).get();
        const currentContractData = currentContractDataResponse.data() as IMindBroClientContract;

        clientContractsData = [...clientContractsData, currentContractData];
      }
      console.log('clientContractsData', clientContractsData);
    }

    res.status(200).json(clientContractsData);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function _getPaymentsConfig(appConfig: IAppConfig, clientId: string): Promise<IMindBroClientPaymentsConfig | null> {
  console.log('_getPaymentsConfig', appConfig, clientId);
  const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
  const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
  console.log('clientPaymentsConfig', clientPaymentsConfig);

  return clientPaymentsConfig;
}

async function _createPaymentsConfig(appConfig: IAppConfig, client: IClient): Promise<IMindBroClientPaymentsConfig> | null {
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
  clientPaymentsConfig: IMindBroClientPaymentsConfig,
  ): Promise<IMindBroClientPaymentsConfig> {
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
    if (clientPaymentsConfig && clientPaymentsConfig.cardId) {
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

      console.log('_createMercadopagoPaymentsConfig ERROR1:', errorResponse, errorMessage, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      throw new CustomError(errorMessage, errorResponse.status);
    } else {
      throw new CustomError(`${error.name}: ${error.message}`, 500);
    }
  }
}

async function _makePaymentWithMercadopago(contract: IContract, appConfig: IAppConfig, clientPaymentConfig: IMindBroClientPaymentsConfig): Promise<IPayment> {
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

// ORDERS
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
  try {
    await  DDBB
            .collection(`business/${appId}/orders`)
            .doc(order.id)
            .set(order);
  } catch (error) {
    throw new CustomError(`${JSON.stringify(order)} - ${contractId} - ${clientId} - ${appId}`, 500);
  }
}

// CONTRACTS
async function addContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contract: IContract = req.body.contract;
  let instantPayment = req.body.instantPayment;
  const startDate = req.body.startDate;
  const seller = req.body.seller;

  console.log('addContract', siteId, token, clientId, contract);
  try {
    const appConfig = await _getAppConfig(siteId);
    const contractCreationDate = new Date().toISOString();
    let clientContract: IMindBroClientContract = {
      status: 'payment_pending',
      date_created: contractCreationDate,
      date_created_timestamp: new Date(),
      id: contract.Id,
      start_date: startDate || null,
      // TODO: Check if the contract already starts minus the first autopay (ie: 1 year = 11 autopays)
      autopays_counter: contract.NumberOfAutopays,
      client_id: clientId,
      last_autopay: null,
    };
    const isTodayTheAutopayDay = _isTodayTheAutopayDay(contract, startDate && moment(startDate), null, appConfig);
    const skipPayment = contract.FirstAutopayFree;

    if (contract.ClientsChargedOn === 'SpecificDate') {
      const specificDate = moment(contract.ClientsChargedOnSpecificDate);
      const today = moment();

      if (specificDate.isBefore(today)) {
        instantPayment = true;
      }
    }

    if (isTodayTheAutopayDay || instantPayment) {
      const skipDeliver = !isTodayTheAutopayDay;
      // Order the contract
      const contractOrder = {
        ...await _processOneContractOrder(contract, clientId, appConfig, token, skipPayment, skipDeliver),
        seller,
      }

      if (contractOrder.payment_status === 'approved') {
        clientContract = {
          ...clientContract,
          autopays_counter: contract.NumberOfAutopays - 1,
          last_autopay: isTodayTheAutopayDay ?
                          appConfig.test && appConfig.today_test_mock?
                            appConfig.today_test_mock :
                            moment().toISOString() :
                          // Because the first payment is made in advance (instantPayment)
                          // we set the last_payment to the first autopay date to calculate
                          // the next autopay dates from it.
                          _getFirstAutopayDate(contract, appConfig).toISOString(),
          status: contractOrder.delivered ? 'active' : 'activation_pending',
        };

        // Save the order to the DDBB
        await _saveOrderToDDBB(contractOrder, contract.Id, clientId, appConfig.id);
      } else {
        throw new CustomError(`Mercadopago ${ contractOrder.payment_status ? `: ${mercadoPagoMessages[contractOrder.payment_status_detail]} ` : ''}`, 400);
      }
    }

    // Save the IClient id into the IContract
    await DDBB
            .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientId}`)
            .set(clientContract);

    const contractData = {
      Id: contract.Id,
      date_created: clientContract.date_created,
    }

    // Save the IContract into the IClient
    await DDBB
            .doc(`business/${appConfig.id}/clients/${clientId}`)
            .update({[`contracts.${contract.Id}`]: contractData});

    res.status(200).json(clientContract);
  } catch (error) {
    _handleServerErrors(error, res);
  }
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

async function updateContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contractId = req.params.contractId;
  const update = req.body;

  console.log('getContracts', siteId, token);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const updateContractResponse = await DDBB
                                          .doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`)
                                          .update(update);
    console.log('updateContractResponse', updateContractResponse);

    const updatedClientResponse = await DDBB.doc(`business/${siteId}/clients/${clientId}`).get();
    const updatedClientContract = updatedClientResponse.data().contracts[contractId];

    res.status(200).json(updatedClientContract);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

// tslint:disable-next-line
/* async function processAllAppsAutopays(req: express.Request, res: express.Response) {
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

  res.status(200).json('Ole');
} */

// BILLING
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
    console.log('contract', contract)

    try {
      await _processAllContractOrders(contract, appConfig, token);
    } catch (error) {
      console.log('_processOneAppAutopays error', error);
      throw new CustomError(`_processOneAppAutopays error: ${JSON.stringify(error)} - ${error}`, 500);
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
  // TODO: When IContract.ClientsChargedOn is related to the client ('OnSaleDate' || 'FirstOrFifteenthOfTheMonth' ||
  // 'FirstOrSixteenthOfTheMonth' || 'FifteenthOrEndOfTheMonth') we'll need to check _isTodayTheAutopayDay
  // for every IClient when the IContract is purchased
  // NOW: waiting for Mindbody response about if ClientsChargedOn: the "ClientsChargedOn" states the date of the first charge,
  // then the next charge will follow the AutopaySchedule specifications (FrequencyType, FrequencyValue, and FrequencyTimeUnit)
  // calculated from this date of the first charge. Is this correct?

  // TODO: Cover IContract.AutopayTriggerType === 'PricingOptionRunsOutOrExpires'
  // TODO: Cover IContract.ActionUponCompletionOfAutopays

  // Check _isTodayTheAutopayDay for every IClient when the have specific autopay date
  /* const checkAutopayDayForEveryClient = contract.ClientsChargedOn === 'OnSaleDate' ||
                                        contract.ClientsChargedOn === 'FirstOrFifteenthOfTheMonth' ||
                                        contract.ClientsChargedOn === 'FirstOrSixteenthOfTheMonth' ||
                                        contract.ClientsChargedOn === 'FifteenthOrEndOfTheMonth';

  if (!checkAutopayDayForEveryClient && !_isTodayTheAutopayDay(contract, null, null, appConfig)) {
    return;
  } */

  console.log('_processAllContractOrders', contract, appConfig);
  const contractClientContractsResponse = await DDBB.collection(`business/${appConfig.id}/contracts/${contract.Id}/clients`).get();
  const contractActiveAndPendingClientContracts = contractClientContractsResponse
                                                    .docs
                                                    .map(snapshot => snapshot.data())
                                                    .filter(clientContract => clientContract.status === 'active' ||
                                                                              clientContract.status === 'payment_pending' ||
                                                                              clientContract.status === 'activation_pending') as IMindBroClientContract[];
  console.log('contractActiveClients', contractActiveAndPendingClientContracts);

  for (let i = 0; i < contractActiveAndPendingClientContracts.length; i++) {
    const currentClientContract: IMindBroClientContract = contractActiveAndPendingClientContracts[i];
    console.log('CURRENT CLIENT: ', i, currentClientContract);
    // When the IContract.status is 'activation_pending' the payment was done in advance so
    // we don't need to calculate the next autopay from the 'last_autopay', we just need to
    // check if today is === the firstAutopayDate to set the IContract.status to
    // deliver the IContract items and set its status to 'active'
    const currentClientContractDateFrom = currentClientContract.status !== 'activation_pending' && currentClientContract.last_autopay ?
                                            moment(currentClientContract.last_autopay) :
                                            null;
    const startDate = currentClientContract.start_date && moment(new Date(currentClientContract.start_date));
    console.log('startDate', startDate);

    if (!_isTodayTheAutopayDay(contract, startDate, currentClientContractDateFrom, appConfig)) {
      continue;
    }

    try {
      const skipPayment = currentClientContract.status === 'activation_pending';
      // Order the contract
      const contractOrder: IOrder = await _processOneContractOrder(contract, currentClientContract.client_id, appConfig, token, skipPayment);
      console.log('CONTRACT ORDER', i, contractOrder)

      if (contractOrder.payment_status === 'approved') {
        // If IContract status is 'payment_pending' or 'activation_pending'
        // we have to set it to 'active' once it is payed
        let currentClientContractUpdate: {[key: string]: any} = {
          shopping_cart: contractOrder.shopping_cart,
          ...contractOrder.delivered && { status: 'active' },
        }

        if (!skipPayment) {
          currentClientContractUpdate = {
            ...currentClientContractUpdate,
            // TEST FUNCTIONALITY
            last_autopay: appConfig.test && appConfig.today_test_mock ?
                              appConfig.today_test_mock :
                              contractOrder.date_created,
          };

          console.log('currentClientContractUpdate', currentClientContractUpdate);

          if (contract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays') {
            await _updateClientAutopaysCounter(appConfig, contract, currentClientContract.client_id, currentClientContract);
          }

          // Save the order to the DDBB
          await _saveOrderToDDBB(contractOrder, contract.Id, currentClientContract.client_id, appConfig.id);
        } else {
          // 'activation_pending' (skipPayment) IContracts have being already paid, so the autopays_counter
          // and last_autopay have been already updated but we need to update the related IOrder delivered
          // status
          const activationPendingOrder = await _getActivationPendingOrder(appConfig, currentClientContract);

          await DDBB
                  .doc(`business/${appConfig.id}/orders/${activationPendingOrder.id}`)
                  .update({ delivered: true });
        }

        await DDBB
                .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${currentClientContract.client_id}`)
                .update(currentClientContractUpdate);
      }

      if (contractOrder.payment_status !== 'approved') {
        // TODO: Check if this is correct
        // Update the IMindBroClientContract with pause status when the payment fails to
        // avoid duplicated billing process (_processAllContractOrders and _processFailedContractOrders)
        /* await DDBB
              .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${currentClientContract.client_id}`)
              .update({ status: 'paused' }); */
      }
    } catch (error) {
      const skipPayment = currentClientContract.status === 'activation_pending';

      if (!skipPayment) {
        const order: IOrder = {
          id: UUID(),
          date_created: new Date().toISOString(),
          date_created_timestamp: new Date(),
          client_id: currentClientContract.client_id,
          contract_id: contract.Id,
          shopping_cart: null,
          delivered: false,
          payment_status: 'error',
          payment_status_detail: JSON.stringify(error.response || error.message || error),
          payment_attempts: [{ error: JSON.stringify(error.response || error.message || error) }],
          seller: null,
        }

        console.log('_processAllContractOrders ERROR', error.message, order);

        await _saveOrderToDDBB(order, contract.Id, currentClientContract.client_id, appConfig.id);
      } else {
        const activationPendingOrder = await _getActivationPendingOrder(appConfig, currentClientContract);

        await DDBB
                .doc(`business/${appConfig.id}/orders/${activationPendingOrder.id}`)
                .update({ payment_attempts: admin.firestore.FieldValue.arrayUnion(error.toString()) });
      }
      // TODO: Check if this is correct
      // Update the IMindBroClientContract with pause status when the payment fails to
      // avoid duplicated billing process (_processAllContractOrders and _processFailedContractOrders)
      /* await DDBB
              .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${currentClientContract.client_id}`)
              .update({ status: 'paused' }); */
    }
  }
}

async function _getActivationPendingOrder(appConfig: IAppConfig, contract: IMindBroClientContract) {
  const ordersRef = await DDBB
                            .collection(`business/${appConfig.id}/orders`)
                            .orderBy('date_created_timestamp')
                            .where('date_created_timestamp', '>=', contract.date_created_timestamp)
                            .where('contract_id', '==', contract.id)
                            .where('client_id', '==', contract.client_id)
                            .where('payment_status', '==', 'approved')
                            .where('delivered', '==', false);

  const ordersSnapshot = await ordersRef.get();
  const orderToUpdate = ordersSnapshot.docs.map(snapshot => snapshot.data())[0] as IOrder;
  console.log('orderToUpdate', orderToUpdate);
  return orderToUpdate;
}

async function _processOneContractOrder(contract: IContract, clientId: string, appConfig: IAppConfig, token: string, skipPayment?: boolean, skipDeliver?: boolean): Promise<IOrder> {

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
  let order: IOrder = {
    id: UUID(),
    date_created: new Date().toISOString(),
    date_created_timestamp: new Date(),
    client_id: clientId,
    contract_id: contract.Id,
    delivered: false,
    shopping_cart: null,
    payment_status: skipPayment ? 'approved' : null,
    payment_status_detail: null,
    payment_attempts: [],
    seller: null,
  }

  // If the IContract has not been paid beforehand ('activation_pending')
  // make the payment and then purchase the products on Mindbody
  // If the IContract has been paid beforehand ('activation_pending')
  // just purchase the products on Mindbody
  if (!skipPayment) {
    const paidOrder = await _payOrder(contract, clientId, appConfig);
    order = {
      ...order,
      ...paidOrder,
    }
  }

  if (order.payment_status === 'approved' && !skipDeliver) {
    const mindBodyCartOrder = {
      ClientId: clientId,
      Test: false, // appConfig.test,
      Items: contractItems,
      Payments: [
        {
          Type: 'Cash',
          Metadata: {
            Amount: contract.FirstPaymentAmountTotal,
          }
        }
      ],
    };
    const cartResponse = await httpClient.post(`${baseUrl}/sale/checkoutshoppingcart`, mindBodyCartOrder, MBHeadersConfig);

    order = {
      ...order,
      delivered: true,
      // TODO: Do we need to save the shopping_cart???
      shopping_cart: cartResponse.data.ShoppingCart,
    }
  }

  console.log('_processOneContractOrder order:', order);

  return order;
}

async function _processFailedContractOrders(contractsCatalog: IContract[], appConfig: IAppConfig, token: string) {
  console.log('_processFailedContractOrders appConfig', appConfig)
  // TODO: Limit the orders to the last month?
  const appOrders = await DDBB.collection(`business/${appConfig.id}/orders`).get();
  const appOrdersArray = appOrders.docs.map(snapshot => snapshot.data());
  console.log('appOrdersArray', appOrdersArray)
  // Canceled orders are the ones that have finished the max number
  // of retries (appConfig.payments.number_of_retries;)
  const failedOrders = appOrdersArray.filter(order => order.payment_status !== 'approved' && order.payment_status !== 'canceled');
  console.log('failedOrders', failedOrders);

  for (let i = 0; i < failedOrders.length; i++) {
    const failedOrder = failedOrders[i];
    const maxRetries = appConfig.payments.number_of_retries;
    let actualRetries = failedOrder.payment_attempts.length;
    console.log('failedOrder', failedOrder, maxRetries, actualRetries);
    const failedContract: IContract = contractsCatalog.find(contract => contract.Id === failedOrder.contract_id);
    const clientContractResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`).get();
    const clientContract = clientContractResponse.data() as IMindBroClientContract;
    console.log('failedContract', failedContract, clientContract);

    try {
      const skipPayment = clientContract.status === 'activation_pending';
      const newContractOrder = await _processOneContractOrder(failedContract, failedOrder.client_id, appConfig, token, skipPayment);
      console.log('CONTRACT ORDER', i, newContractOrder, failedOrder.id, failedOrder);

      let contractOrderUpdate = {
        id: failedOrder.id,
        date_created_timestamp: newContractOrder.payment_status === 'approved' ? new Date() : failedOrder.date_created_timestamp,
        payment_status: newContractOrder.payment_status,
        payment_status_detail: newContractOrder.payment_status_detail,
        payment_attempts: [...failedOrder.payment_attempts, ...newContractOrder.payment_attempts],
      }

      if (failedContract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays' &&
          newContractOrder.payment_status !== 'approved' &&
          maxRetries === ++actualRetries) {
          contractOrderUpdate = {...contractOrderUpdate, payment_status : 'canceled'};

          // Pause the IContract when the payment retries exceed the appConfig.payments.number_of_retries
          await DDBB
                  .doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`)
                  .update({ status: 'paused_no_payment' });
      }

      // Update the IOrder with the new payment attempt
      await DDBB.doc(`business/${appConfig.id}/orders/${failedOrder.id}`).update(contractOrderUpdate);

      if (newContractOrder.payment_status === 'approved') {
        // TODO: Check if this is correct
        // Activate/Resume the failed IMindBroClientContract (it was paused to avoid duplicated
        // billing process (_processAllContractOrders and _processFailedContractOrders)
        /* await DDBB
              .doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`)
              .update({ status: 'active' }); */
        if (failedContract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays') {
          await _updateClientAutopaysCounter(appConfig, failedContract, failedOrder.client_id);
        }
      }

      console.log('contractOrderUpdate', contractOrderUpdate);
    } catch (error) {
      const contractOrderUpdate = {
        payment_status: maxRetries === ++actualRetries ? 'canceled' : 'error',
        payment_status_detail: JSON.stringify(error.response || error.message || error),
        payment_attempts: [...failedOrder.payment_attempts, { error: JSON.stringify(error.response || error.message || error) }],
      }

      await DDBB.doc(`business/${appConfig.id}/orders/${failedOrder.id}`).update(contractOrderUpdate);
      console.log('_processFailedContractOrders ERROR', error.message, contractOrderUpdate);
    }
  }
}

async function _payOrder(contract: IContract, clientId: string, appConfig: IAppConfig) {
  const clientPaymentConfig = await _getPaymentsConfig(appConfig, clientId);

  if (clientPaymentConfig && clientPaymentConfig.cardId) {
    if (appConfig.payments.gateaway.name === 'mercadopago') {
      const paymentResponse: IPayment = await _makePaymentWithMercadopago(contract, appConfig, clientPaymentConfig);

      const order = {
        payment_status: paymentResponse.status,
        payment_status_detail: paymentResponse.status_detail,
        payment_attempts: [paymentResponse],
      }

      return order;
    } else {
      throw new CustomError('This site does not have a Gateaway associated', 400);
    }
  } else {
    throw new CustomError('This client does not have a Credit Card associated', 400);
  }
}

async function _updateClientAutopaysCounter(appConfig: IAppConfig, contract: IContract, clientId: string, clientContract?: IMindBroClientContract) {
  console.log('updateClientAutopayCounter', appConfig, contract, clientId);
  if (!clientContract) {
    const clientContractResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientId}`).get();
    // tslint:disable-next-line:no-parameter-reassignment
    clientContract = clientContractResponse.data() as IMindBroClientContract;
  }

  const updatedContractClient: {[key: string]: any} = {
    autopays_counter: clientContract.autopays_counter - 1,
  };

  if (updatedContractClient.autopays_counter === 0) {
    if (contract.ActionUponCompletionOfAutopays === 'ContractAutomaticallyRenews') {
      updatedContractClient.autopays_counter = contract.NumberOfAutopays;
    } else {
      updatedContractClient.status = 'terminated';
    }
  }

  await DDBB
          .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientId}`)
          .update(updatedContractClient);
}

export function _isTodayTheAutopayDay(contract: IContract, startDate?: moment.Moment, dateFrom?: moment.Moment, appConfig?: IAppConfig, todayMock?: moment.Moment ): boolean {
  console.log('_isTodayTheAutopayDay', contract, startDate, dateFrom, appConfig, todayMock)
  // Test functionality
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock) :
                  moment();

  if (startDate && startDate.isSameOrAfter(today)) {
    return today.isSame(startDate);
  }

  const nextAutopay = _getNextAutopayDate(contract, dateFrom, appConfig);
  console.log('nextAutopay', today, nextAutopay)

  return today.isSame(nextAutopay, 'day');
}

// We use the IMindBroClientContract.last_autopay to calculate the next one
function _getNextAutopayDate(contract: IContract, dateFrom?: moment.Moment, appConfig?: IAppConfig) {
  const FrequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                              'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                                'months' :
                                'years';
  const nextAutopayDate = dateFrom ?
                            dateFrom
                              .startOf('day')
                              .clone()
                              .add(contract.AutopaySchedule.FrequencyValue, FrequencyTimeUnit) :
                            _getFirstAutopayDate(contract, appConfig);

  return nextAutopayDate;
}

function _getFirstAutopayDate (contract: IContract, appConfig?: IAppConfig): moment.Moment {
  let firstAutopayDate;
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');
  const first = today.date() === 1 ? today : moment().add(1, 'months').startOf('month');
  const last = today.date() === moment().endOf('month').date() ? today : moment().endOf('month');
  const fifteen = today.date() <= 15 ? moment().date(15) : moment().add(1, 'months').date(15);
  const sixteen = today.date() <= 16 ? moment().date(16) : moment().add(1, 'months').date(16);

  switch (contract.ClientsChargedOn) {
    case 'FirstOfTheMonth':
      firstAutopayDate = first;
      break;

    case 'FifteenthOfTheMonth':
      firstAutopayDate = fifteen
      break;

    case 'LastDayOfTheMonth':
      firstAutopayDate = last;
      break;

    // TODO: Cover this case
    case 'FirstOrFifteenthOfTheMonth':
      firstAutopayDate = today.diff(first, 'days') < today.diff(fifteen, 'days') ?
                          first :
                          fifteen;
      break;

    case 'FirstOrSixteenthOfTheMonth':
      firstAutopayDate = today.diff(first, 'days') < today.diff(sixteen, 'days') ?
                          first :
                          sixteen;
      break;

    case 'FifteenthOrEndOfTheMonth':
      firstAutopayDate = today.diff(fifteen, 'days') < today.diff(last, 'days') ?
                          fifteen :
                          last;
      break;

    case 'SpecificDate':
      firstAutopayDate = moment(contract.ClientsChargedOnSpecificDate);
      break;

    case 'OnSaleDate':
      firstAutopayDate = today;
      break;

    default:
      firstAutopayDate = today;
  }

  console.log('firstAutopayDate', firstAutopayDate)
  return firstAutopayDate;
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

// Mindbody calculates the first autopay date based on the IContract.ClientsChargedOn
// Once it is all the rest autopays will be calculated based on it (ie: 2 weeks from it)
// according to the IContract.AutopaySchedule


// TEST FUNCTIONALITY
async function changeClientCreditCard(req: express.Request, res: express.Response) {
  // Change the client's credit card to provoque the selected error (FUND, SECU...)
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const newCreditCard = req.body.credit_card;
  const client = req.body.client;
  console.log('changeClientCreditCard', siteId, token, newCreditCard, client);

  try {
    await DDBB
            .doc(`business/${siteId}/clients/${client.UniqueId}`)
            .update({payments_config: newCreditCard});

    res.status(200).json('Client Card Changed');
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function triggerBillingCycle (req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const appConfig = await _getAppConfig(siteId);

  try {
    await _processOneAppAutopays(appConfig);

    res.status(200).json('Billing Cycle triggered!')
  } catch(error) {
    _handleServerErrors(error, res);
  }
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
  .get(getConfig)
  // TEST FUNCTIONALITY
  .post(updateConfig)

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
  .post(addContract)
  .get(getClientContracts)

server
  .route('/clients/:id/contracts/:contractId')
  .patch(updateContract);

// ORDERS
server
  .route('/orders')
  .get(getOrders);

server
  .route('/orders/:id/refund')
  .post(refundPayment);

// CONTRACTS
server
  .route('/contracts')
  .get(getContracts);

// TEST ROUTES
server
  .route('/clients/change_card')
  .post(changeClientCreditCard);

server
  .route('/orders/trigger')
  .post(triggerBillingCycle);

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);

/* exports.scheduledFunction = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
  console.log('5 MINUTES: This will be run every 5 minutes!');
}); */


