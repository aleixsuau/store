/// <reference types="../typings" />

import * as express from 'express';
import * as moment from 'moment-timezone';
import { baseUrl, httpClient, _login, _getAppConfig, _handleServerErrors, DDBB} from '../utils';
import { _createPaymentsConfig, _isTodayTheAutopayDay, _getFirstAutopayDate, _getNextAutopayDate, _getDebtAutopays } from '../payments';
import { _processOneContractOrder, _getContracts, _updateContractAfterProcessOrder } from '../contracts';
import { _getAllClients } from '../clients';


export const clientRouter = express.Router();

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
    const clientsResponse = await _getAllClients(appConfig.apiKey, siteId, token, searchText, limit, offset);

    res.status(clientsResponse.status).json(clientsResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function addClient(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const client: IClient = {
    ...req.body.Client,
    date_created: new Date(),
  };
  console.log('_addClient', client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...)(If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.

  // Turn CardNumber & CVV to string
  if (client.ClientCreditCard && client.ClientCreditCard.CVV) {
    client.ClientCreditCard.CVV = `${client.ClientCreditCard.CVV}`;
    client.ClientCreditCard.CardNumber = `${client.ClientCreditCard.CardNumber}`;
  }

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

  console.log('updateClient', clientId, client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...) (If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.
  // Turn CardNumber & CVV to string
  if (client.ClientCreditCard && client.ClientCreditCard.CVV) {
    client.ClientCreditCard.CVV = `${client.ClientCreditCard.CVV}`;
    client.ClientCreditCard.CardNumber = `${client.ClientCreditCard.CardNumber}`;
  }

  // TODO: handle remove card when the user had a credit card and updates without credit card
  try {
    const appConfig = await _getAppConfig(siteId);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    const isDeletingCard = client.ClientCreditCard && !client.ClientCreditCard.CardNumber;
    let paymentsConfig: IMindBroClientPaymentsConfig = null;

    if (isSavingANewCreditCard) {
      paymentsConfig = await _createPaymentsConfig(appConfig, client);
    }

    console.log('updateClient 1: ', paymentsConfig, isSavingANewCreditCard, isDeletingCard, client);

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
    console.log('updatedClientResponse', updatedClientResponse)

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
      if (appConfig.payments.gateway.name === 'mercadopago') {
        const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
        const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
        const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;

        await httpClient.delete(`${appConfig.payments.gateway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
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

async function addContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contract: IContract = req.body.contract;
  let instantPayment = req.body.instantPayment || null;
  const startDate = req.body.startDate || null;
  const seller = req.body.seller || null;
  const accepted_contract_terms = req.body.acceptedContractTerms || null;
  const accepted_business_terms = req.body.acceptedBusinessTerms || null;

  console.log('addContract', siteId, token, clientId, instantPayment, startDate, seller, contract);

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
      client_id: clientId,
      autopays_counter: contract.NumberOfAutopays,
      last_autopay: null,
      accepted_contract_terms,
      accepted_business_terms,
    };
    const isTodayTheAutopayDay = _isTodayTheAutopayDay(contract, startDate && moment(startDate), null, appConfig);
    const skipPayment = contract.FirstAutopayFree;

    if (contract.ClientsChargedOn === 'SpecificDate') {
      const specificDate = moment(contract.ClientsChargedOnSpecificDate);
      // TEST FUNTIONALITY
      const today = appConfig.test && appConfig.today_test_mock ?
                      moment(appConfig.today_test_mock).startOf('day') :
                      moment().startOf('day');

      if (specificDate.isSameOrBefore(today, 'day')) {
        instantPayment = true;
      }
    }

    if (isTodayTheAutopayDay || instantPayment) {
      const skipDeliver = !isTodayTheAutopayDay;
      const throwIfPaymentFails = true;
      // Order the contract
      const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver, throwIfPaymentFails, seller);

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
      }
    }

    // Save the IClient id into the IContract
    await DDBB
            .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientId}`)
            .set(clientContract);

    const contractData = {
      Id: contract.Id,
      date_created: clientContract.date_created,
      status: 'active',
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

async function getClientContracts(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const clientId = req.params.id;

  console.log('getClientContracts', siteId, clientId)

  try {
    const clientContractsResponse = await DDBB.doc(`business/${siteId}/clients/${clientId}`).get();
    console.log('clientContractsResponse', clientContractsResponse.data());
    const clientContracts = clientContractsResponse.data() &&
                            Object
                              .values(clientContractsResponse.data().contracts)
                              .map((clientContract: any) => clientContract.Id);
    let clientContractsData: IMindBroClientContract[] = [];
    console.log('clientContracts', clientContracts);

    if (clientContracts) {
      for (const currentContractId of clientContracts) {
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

async function updateContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contractId = req.params.contractId;
  const update = req.body;

  console.log('updateContract', siteId, token);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);

    if (update && update.status) {
      if (update.status === 'active') {
        const contractsCatalogue: IContract[] = await _getContracts(siteId);
        const contract: IContract = contractsCatalogue.find(contractItem => contractItem.Id === contractId);
        const clientContractResponse = await DDBB
                                              .doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`)
                                              .get();
        const clientContract = clientContractResponse.data() as IMindBroClientContract;
        console.log('updateContract clientContract', clientContract)

        if (clientContract.status === 'paused') {
          // Default to instantPayment when resuming a contract
          // TEST FUNCTIONALITY
          const today = appConfig.test && appConfig.today_test_mock ?
                          moment(appConfig.today_test_mock) :
                          moment();
          const lastAutopay = moment(clientContract.last_autopay);
          const nextAutopay = _getNextAutopayDate(contract, lastAutopay, appConfig);
          console.log('updateContract nextAutopay', nextAutopay)

          // Process a new IOrder only if the previous (the one that was active when
          // the IContract was paused) has expired.
          // Else (if the previous IOrder is active), mark the IContract.start_date
          // to the next first autopay date skipping today (just in case resume the
          // IContract is done the same day that it should be charged).
          if (today.isSameOrAfter(nextAutopay, 'day')) {
            const skipPayment = false;
            const skipDeliver = !_isTodayTheAutopayDay(contract, null, null, appConfig);
            const throwIfPaymentFails = true;
            const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver, throwIfPaymentFails);
            console.log('updateContract contractOrder', contractOrder)
            await _updateContractAfterProcessOrder(appConfig, contractOrder, clientContract, contract);
          } else {
            await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
            await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
          }
        } else if (clientContract.status === 'paused_no_payment') {
          // If the IMindBroClientContract.status === 'paused_no_payment'
          // Then we are trying to reactivate the IMindBroClientContract
          // Then we are going to charge all the debt autopays
          // and deliver the contractItems for the current period
          const skipPayment = false;
          const skipDeliver = false;
          const throwIfPaymentFails = true;
          const debtAutopays = await _getDebtAutopays(contract, clientContract, appConfig);
          const debtAmount = contract.RecurringPaymentAmountTotal * debtAutopays;
          const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver, throwIfPaymentFails, null, debtAmount);
          console.log('updateContract contractOrder', contractOrder)
          await _updateContractAfterProcessOrder(appConfig, contractOrder, clientContract, contract);
          // await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
        } else {
          await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
          await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
        }
      } else {
        await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
        await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
      }
    } else {
      await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
    }

    res.status(200).json(`Contract ${contractId} updated for client ${clientId}`);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}


clientRouter
  .route('/')
  .get(getAllClients)
  .post(addClient);

clientRouter
  .route('/:id')
  .patch(updateClient);


clientRouter
  .route('/:id/contracts')
  .post(addContract)
  .get(getClientContracts);

clientRouter
  .route('/:id/contracts/:contractId')
  .patch(updateContract);

