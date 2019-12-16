/* EXPLANATION
- This project relies on MindBody:
  - IContract:
    The IContract is a MindBody contract that contains all the items that are going to be charged.
    It also constains the periodicity of the charges (Autopays) on its property AutopaySchedule.FrequencyType that
    can be:
        - 'SetNumberOfAutopays': set a schedule timing (AutopaySchedule.FrequencyValue, AutopaySchedule.FrequencyTimeUnit)
           and a number of payments (IContract.NumberOfAutopays).
        - 'MonthToMonth': charge every month until the business owner stops it (or the IClient).

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
          2 - If _isTodayTheAutopayDay
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
    won't be delivered until the IContract.ClientsChargeOn date (StartDate).
    1 - The IMindBroClientContract data (date_created, status, autopay_counter, id...) is added to the IContract
      into the DDBB (business/${businessId}/contracts/${contractId}/clients/${client.Id}) under the IClient.Id with
      the status 'activation_pending'.
    2 - The IContract (id and date_created) is added to the IClient (business/${businessId}/clients/${clientId}/contracts/${contractId})

  - If FirstPaymentOccurs == ‘StartDate’, the first charge is done on the specified ‘StartDate’ (following the IContract.ClientsChargeOn)
    and The IMindBroClientContract is added to the DDBB with the status 'payment_pending'. When the StartDate arrives, we process the payment,
    deliver the product and set last_autopay to the StartDate. The rest of autopays are done following the IContract.AutopaySchedule
    calculated based on the last_autopay.

  * ‘StartDate’ must be the same than the Contract.clientsChargeOn (‘firstOfTheMonth...’) if not it throws error, this is
    Contract.clientsChargeOn determines the StartDate (Contract.clientsChargeOn === StartDate).
  * If FirstPaymentOccurs === ‘Instant’ and Contract.clientsChargeOn states another day, the first charge is done with the
    purchase, we set last_autopay to the getFirstAutopayDate, and the rest of autopays are done following the IContract.AutopaySchedule
    calculated based on the last_autopay.

  CONTRACT STATUSES:
  1 - activation_pending:
      The IClient purchases a IContract and pays 'Instant' but the IContract is activated depending on:
      1 - Default ClientsChargeOn (startDate): the first IContract.ClientsChargeOn date match (FirstOfTheMonth...).
      2 - Custom ClientsChargeOn (startDate): the date that admin user chose when it made the purchase (it needs to
        follow the IContract.ClientsChargedOn ()).

      * When the ClientsChargeOn date arrives, the IOrder is made and sent to Mindbody, so the IClient is able to
      start using the gym, and the IContract.status = 'active'

  2 - payment_pending:
      The IClient purchases a IContract but he/she has not paid the current Autopay. This case happens when
      the payment of the purchase was not 'Instant', so the payment will take place on the IContract.ClientsChargeOn
      (custom or default (startDate)).

  3 - active:
      The IClient has purchased a IContract, has pait it and then it has been activated, this is, the IContract.ClientsChargeOn
      date has happened.

  4 - paused:
      The IClient has taken a break (summer holidays...)

  5 - paused_no_payment:
      The IClient has exceed the max number of retries (appConfig.payments.number_of_retries)
      in the last autopay.

  6 - canceled:
      The IContract has been canceled by an admin user.

  7 - terminated:
      The IContract ended (the NumberOfAutopays finished).
*/

import * as functions from 'firebase-functions';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as moment from 'moment-timezone';
import * as parser from 'fast-xml-parser';
import { baseUrl, DDBB, httpClient, _getAppConfig, _handleServerErrors, _login, _findOrderByStatus, _getClientEnviromentVariables, appConfigMiddleware } from './utils';
import { _isTodayTheAutopayDay, _getNextAutopayDate, _getLastAutopayDate, _getFirstAutopayDate, _getPaymentsConfig, _processAllAppsAutopays, _processOneAppAutopays  } from './payments';
import { _getContracts, _processFailedContractOrders } from './contracts';
import { _getAllClients } from './clients';
import { backup } from './backup';

// ROUTERS
import { errorRouter } from './routes/error.routes';
import { authRouter } from './routes/auth.routes';
import { configRouter } from './routes/config.routes';
import { clientRouter } from './routes/client.routes';
import { orderRouter } from './routes/order.routes';
import { contractRouter } from './routes/contract.routes';

const server = express();
// MIDDLEWARE
// Automatically allow cross-origin requests
server.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'SiteId'],
}));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));
server.use(appConfigMiddleware)


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

// IFRAME
async function validateLogin(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const username = req.body.username;
  const password = req.body.password;
  console.log('validateLogin', siteId, token, username, password);

  const message = `<?xml version="1.0" encoding="utf-8"?>
                    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                      <soap:Body>
                        <ValidateLogin xmlns="http://clients.mindbodyonline.com/api/0_5_1">
                          <Request>
                            <Username>${username}</Username>
                            <Password>${password}</Password>
                          </Request>
                        </ValidateLogin>
                      </soap:Body>
                    </soap:Envelope>`;

  const config = {
    headers: {
    'API-key': appConfig.apiKey,
    'SiteId': siteId,
    'Content-Type': 'text/xml;charset=UTF-8',
    'SOAPAction': 'http://clients.mindbodyonline.com/api/0_5_1/ValidateLogin',
    }
  };

  try {
    const validateLoginSoap = await httpClient.post('https://api.mindbodyonline.com/0_5_1/ClientService.asmx', message, config);
    const validateLoginJSON = parser.parse(validateLoginSoap.data);
    const validateLoginResponse = validateLoginJSON &&
                                    validateLoginJSON['soap:Envelope']['soap:Body'].ValidateLoginResponse.ValidateLoginResult;
    console.log('validateLoginResponse', validateLoginResponse, validateLoginJSON['soap:Envelope']['soap:Body'].ValidateLoginResponse);

    let finalResponse = {
      status: validateLoginResponse.Status,
      code: validateLoginResponse.ErrorCode,
      message: validateLoginResponse.Message,
      client: validateLoginResponse.Client,
    }

    if (validateLoginResponse.Client) {
      const clientSearchResults = await _getAllClients(appConfig.apiKey, siteId, token, validateLoginResponse.Client.ID);

      finalResponse = {
        ...finalResponse,
        client: clientSearchResults.data.Clients[0],
      };
    }

    console.log('validateLogin finalResponse', finalResponse)

    res.status(finalResponse.code).json(finalResponse);
  } catch (error) {
    console.log('validateLogin error', error);
    _handleServerErrors(error, res);
  }
}

async function sendResetPasswordEmail(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const UserEmail = req.body.UserEmail;
  let UserFirstName = req.body.UserFirstName;
  let UserLastName = req.body.UserLastName;
  console.log('sendResetPasswordEmail', UserEmail, UserFirstName, UserLastName);

  try {
    if (!UserFirstName || !UserLastName) {
      const clientResponse = await _getAllClients(appConfig.apiKey, siteId, token, UserEmail);
      console.log('sendResetPasswordEmail clientResponse', clientResponse.data)
      const client = clientResponse.data.Clients[0];

      if (!client) {
        res.status(404).json('No user found with this email');
        return;
      }

      UserFirstName = UserFirstName || client.FirstName;
      UserLastName = UserLastName || client.LastName;
    }

    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };

    const data = {
      UserEmail,
      UserFirstName,
      UserLastName,
    };

    const resetPasswordResponse = await httpClient.post(`${baseUrl}/client/sendpasswordresetemail`, data, config);
    console.log('resetPasswordResponse', Object.keys(resetPasswordResponse), resetPasswordResponse.data);

    res.status(200).json('Reset password email sent');
  } catch (error) {
    console.log('sendResetPasswordEmail error', error)
    _handleServerErrors(error, res);
  }
}

async function requiredClientFields(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };

  try {
    const requiredFields = await httpClient.get(`${baseUrl}/client/requiredclientfields`, config);
    console.log('requiredFields', Object.keys(requiredFields), requiredFields.data.RequiredClientFields)

    res.status(200).json(requiredFields.data.RequiredClientFields);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function gatewayReturnPage(req: express.Request, res: express.Response) {
  console.log('gatewayReturnPage', req.body);
  const payment_reference = req.body.payment_reference;
  /* const transaction_id = req.body.transaction_id;
  const stcpay_reference_number = req.body.stcpay_reference_number;
  const stcpay_expiration_time = req.body.stcpay_expiration_time;
  const stcpay_result = req.body.stcpay_result; */

  // TODO: Finish this
  // On the fron, we have to set a listener

  const page = `
      <!doctype html>
      <head>
        <title>Time</title>
        <script type="text/javascript">
          parent.postMessage("payment_reference ${payment_reference}" , "http://localhost:4200")
        </script>
      </head>
      <body>
        payment_reference: ${payment_reference}
      </body>
    </html>
  `;

  res.status(200).send(page);
}

// TEST FUNCTIONALITY
// Mindbody calculates the first autopay date based on the IContract.ClientsChargedOn
// Once it is all the rest autopays will be calculated based on it (ie: 2 weeks from it)
// according to the IContract.AutopaySchedule
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

async function processAllAppsAutopays (req?: express.Request, res?: express.Response) {
  try {
    await _processAllAppsAutopays();

    res.status(200).json('processAllAppsAutopays Cycle triggered!')
  } catch(error) {
    _handleServerErrors(error, res);
  }
}


// ROUTERS
// ERRORS
server
  .use('/errors', errorRouter);

// AUTH
server
  .use('/auth', authRouter);

// CONFIG
server
  .use('/config', configRouter);

// CLIENTS
server
  .use('/clients', clientRouter)

// ORDERS
server
  .use('/orders', orderRouter)

// CONTRACTS
server
  .use('/contracts', contractRouter)

// IFRAME
server
  .route('/validateLogin')
  .post(validateLogin);

server
  .route('/sendResetPasswordEmail')
  .post(sendResetPasswordEmail);

server
  .route('/requiredClientFields')
  .get(requiredClientFields);

server
  .route('/returnUrl')
  .post(gatewayReturnPage);

// TEST ROUTES
server
  .route('/clients/change_card')
  .post(changeClientCreditCard);

server
  .route('/orders/trigger')
  .post(triggerBillingCycle);

server
  .route('/config/:siteId')
  .post(updateConfig);

server
  .route('/processAllAppsAutopays')
  .post(processAllAppsAutopays);

server.all('*', (req, res) => {
    res.status(404).json(`Can't find ${req.originalUrl}`);
});

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);

// SCHEDULED TASKS
// Schedule Timing follows https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules
// https://alvinalexander.com/linux/unix-linux-crontab-every-minute-hour-day-syntax

// Daily check Autopays
exports.billingCycle = functions.pubsub
                                  .schedule('20 * * * *')
                                  .onRun(async (context) => {
                                    console.log('BillingCycle: checking (every minute 20 of every hour) if any app has to run its billing cycle', moment());
                                    await _processAllAppsAutopays();
                                  });

// BACKUP
exports.dbBackup = functions.pubsub
                              .schedule('every day 23:30')
                              .timeZone('Europe/Madrid')
                              .onRun(async context => {
                                try {
                                  await backup()
                                } catch (err) {
                                  console.error('error running db backup cron', err)
                                }
                              })


