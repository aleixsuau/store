/// <reference types="./typings" />
import * as moment from 'moment-timezone';
import { baseUrl, httpClient, _login, _getAppConfig, _handleServerErrors, DDBB, CustomError, _findOrderByStatus, _getClientEnviromentVariables } from './utils';
import { contractsMock, _getContracts, _processAllContractOrders, _processFailedContractOrders } from './contracts';

export async function _getPaymentsConfig(appConfig: IAppConfig, clientId: string): Promise<IMindBroClientPaymentsConfig | null> {
  console.log('_getPaymentsConfig', appConfig, clientId);
  const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
  const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
  console.log('clientPaymentsConfig', clientPaymentsConfig);

  return clientPaymentsConfig;
}

export async function _createPaymentsConfig(appConfig: IAppConfig, client: IClient): Promise<IMindBroClientPaymentsConfig> | null {
  console.log('_createPaymentsConfig', appConfig, client, client.Id);

  const clientPaymentsConfig = await _getPaymentsConfig(appConfig, client.Id);

  // If the user comes with a CVV inside the credit card data, then
  // he is creating a new Credit Card (MindBody doesn't save CVV)
  // If the user already has a CrediCard, pass its data to update
  if (appConfig.payments.gateway.name === 'mercadopago') {
    return _createMercadopagoPaymentsConfig(appConfig, client, clientPaymentsConfig);
  }

  return null;
}

export async function _createMercadopagoPaymentsConfig(
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
    const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
    const apiKey = appConfig.test ? appConfig.payments.gateway.apiKey.test : appConfig.payments.gateway.apiKey.production;
    const creditCardTokenRequest = {
      authenticate: true,
      card_number: client.ClientCreditCard.CardNumber.toString(),
      security_code: client.ClientCreditCard.CVV.toString(),
      expiration_month: client.ClientCreditCard.ExpMonth.toString(),
      expiration_year: client.ClientCreditCard.ExpYear.toString(),
      cardholder: {
        name: appConfig.test && appConfig.payments.gateway.name === 'mercadopago' ?
                appConfig.payments.gateway.test_payment_response :
                `${client.FirstName} ${client.LastName}`,
      }
    };
    console.log('apiKey', apiKey, creditCardTokenRequest)
    const creditCardToken = await httpClient.post(`${appConfig.payments.gateway.url}/card_tokens?public_key=${apiKey}`, creditCardTokenRequest);
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
      const clientResponse = await httpClient.post(`${appConfig.payments.gateway.url}/customers?access_token=${apiToken}`, clientData);
      clientId = clientResponse.data.id;
    }

    // Associate the creditCardTokenId to a user (required by Mercadopago)
    const card = {
      token: creditCardTokenId,
    }

    const newCardResponse = await httpClient.post(`${appConfig.payments.gateway.url}/customers/${clientId}/cards?access_token=${apiToken}`, card);
    const cardId = newCardResponse.data.id;

    // If the user already had a Credit Card, remove it after
    // saving the new one (we only allow one credit card per client)
    if (clientPaymentsConfig && clientPaymentsConfig.cardId) {
      await httpClient.delete(`${appConfig.payments.gateway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
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

export async function _makePaymentWithMercadopago(contract: IContract, appConfig: IAppConfig, clientPaymentConfig: IMindBroClientPaymentsConfig, amount: number): Promise<IPayment> {
  console.log('_makePaymentWithMercadopago', contract, clientPaymentConfig, amount, appConfig);
  const paymentsApiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
  const paymentsApiKey = appConfig.test ? appConfig.payments.gateway.apiKey.test : appConfig.payments.gateway.apiKey.production;
  console.log('paymentsApiKey', paymentsApiKey, paymentsApiToken, `${appConfig.payments.gateway.url}/card_tokens?public_key=${paymentsApiKey}`, typeof clientPaymentConfig.cardId, clientPaymentConfig.cardId, typeof clientPaymentConfig.CVV, clientPaymentConfig.CVV)
  const cardTokenResponse = await httpClient.post(`${appConfig.payments.gateway.url}/card_tokens?public_key=${paymentsApiKey}`, { card_id: clientPaymentConfig.cardId, security_code: clientPaymentConfig.CVV })
  console.log('cardTokenResponse', cardTokenResponse)
  const cardToken = cardTokenResponse.data.id;
  // TODO: Cover the cases when the order is the first or last
  const mercadopagoOrder = {
    transaction_amount: amount || contract.RecurringPaymentAmountTotal,
    token: cardToken,
    description: contract.Description,
    installments: 1,
    payer: {
      id: clientPaymentConfig.clientId,
    }
  };
  console.log('mercadopagoOrder 1: ', mercadopagoOrder, paymentsApiToken)
  const paymentResponse = await httpClient.post(`${appConfig.payments.gateway.url}/payments?access_token=${paymentsApiToken}`, mercadopagoOrder);
  console.log('mercadopagoPaymentResponse 1', paymentResponse.data);

  return paymentResponse.data as IPayment;
}

export function _isTodayTheAutopayDay(contract: IContract, startDate?: moment.Moment, dateFrom?: moment.Moment, appConfig?: IAppConfig): boolean {
  // TEST FUNCTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');

  if (startDate && startDate.isSameOrAfter(today, 'day')) {
    return today.isSame(startDate, 'day');
  }

  const nextAutopay = _getNextAutopayDate(contract, dateFrom, appConfig);
  // console.log('nextAutopay', today, nextAutopay)

  return today.isSame(nextAutopay, 'day');
}

// We use the IMindBroClientContract.last_autopay (dateFrom) to calculate the next one
export function _getNextAutopayDate(contract: IContract, dateFrom?: moment.Moment, appConfig?: IAppConfig) {
  let frequencyTimeUnit;
  let frequencyValue;

  if (contract.AutopaySchedule.FrequencyType === 'MonthToMonth') {
    frequencyTimeUnit = 'months';
    frequencyValue = 1;
  } else {
    frequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                           'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                             'months' :
                             'years';
    frequencyValue = contract.AutopaySchedule.FrequencyValue;
  }

  const nextAutopayDate = dateFrom ?
                            dateFrom
                              .startOf('day')
                              .clone()
                              .add(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit) :
                            _getFirstAutopayDate(contract, appConfig);

  return nextAutopayDate;
}

export function _getLastAutopayDate(contract: IContract, dateFrom?: moment.Moment, appConfig?: IAppConfig) {
  let frequencyTimeUnit;
  let frequencyValue;
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');

  const nextAutopayDate = _getNextAutopayDate(contract, null, appConfig);
  // console.log('_getLastAutopayDate nextAutopayDate', nextAutopayDate, today)

  if (contract.AutopaySchedule.FrequencyType === 'MonthToMonth') {
    frequencyTimeUnit = 'months';
    frequencyValue = 1;
  } else {
    frequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                           'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                             'months' :
                             'years';
    frequencyValue = contract.AutopaySchedule.FrequencyValue;
  }

  if (dateFrom) {
    return dateFrom
            .startOf('day')
            .clone()
            .subtract(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit);
  }

  if (today.isSame(nextAutopayDate, 'day')) {
    return today;
  }

  const lastAutopayDate = nextAutopayDate.subtract(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit);

  // console.log('lastAutopayDate', lastAutopayDate);
  if (lastAutopayDate.isValid()) {
    return lastAutopayDate;
  } else {
    throw new CustomError('Invalid Date', 500);
  }
}

export function _getFirstAutopayDate (contract: IContract, appConfig?: IAppConfig, skipToday?: boolean): moment.Moment {
  let firstAutopayDate;
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');

  if (skipToday) { today.add(1, 'days') }

  const first = today.date() === 1 ? today : today.clone().add(1, 'months').startOf('month');
  const last = today.clone().endOf('month');
  const fifteen = today.date() <= 15 ? today.clone().date(15) : today.clone().add(1, 'months').date(15);
  const sixteen = today.date() <= 16 ? today.clone().date(16) : today.clone().add(1, 'months').date(16);

  // console.log('_getFirstAutopayDate', contract.ClientsChargedOn, skipToday, appConfig.today_test_mock, today, first, last, fifteen, sixteen);

  switch (contract.ClientsChargedOn) {
    case 'FirstOfTheMonth':
      firstAutopayDate = first;
      break;

    case 'FifteenthOfTheMonth':
      firstAutopayDate = fifteen;
      break;

    case 'LastDayOfTheMonth':
      firstAutopayDate = last;
      break;

    case 'FirstOrFifteenthOfTheMonth':
      firstAutopayDate = first.diff(today, 'days') < fifteen.diff(today, 'days') ?
                          first :
                          fifteen;
      break;

    case 'FirstOrSixteenthOfTheMonth':
      firstAutopayDate = first.diff(today, 'days') < sixteen.diff(today, 'days') ?
                          first :
                          sixteen;
      break;

    case 'FifteenthOrEndOfTheMonth':
      firstAutopayDate = fifteen.diff(today, 'days') < last.diff(today, 'days') ?
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

  if (firstAutopayDate.isValid()) {
    return firstAutopayDate;
  } else {
    throw new CustomError('Invalid Date', 500);
  }
}

export async function _getDebtAutopays(contract: IContract, clientContract: IMindBroClientContract, appConfig: IAppConfig) {
  const order = await _findOrderByStatus(appConfig, clientContract, 'canceled');
  let lastAutopayDate = moment(order.date_created);
  let debtAutopaysArray: moment.Moment[] = [lastAutopayDate];
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');
  let nextAutopayDate = _getNextAutopayDate(contract, lastAutopayDate, appConfig);

  while (nextAutopayDate.isSameOrBefore(today, 'day')) {
    lastAutopayDate = nextAutopayDate;
    debtAutopaysArray = [...debtAutopaysArray, lastAutopayDate];
    nextAutopayDate = _getNextAutopayDate(contract, lastAutopayDate, appConfig);
  }

  // Don't charge more debt than the current contract autopays left
  const debtAutopays = debtAutopaysArray.length > clientContract.autopays_counter ?
                          clientContract.autopays_counter :
                          debtAutopaysArray.length;

  console.log('debtAutopays: ', debtAutopays);

  return debtAutopays;
}

export async function _payOrder(contract: IContract, clientId: string, appConfig: IAppConfig, amount: number) {
  const clientPaymentConfig = await _getPaymentsConfig(appConfig, clientId);
  console.log('_payOrder', _payOrder, clientPaymentConfig)

  if (clientPaymentConfig && clientPaymentConfig.cardId) {
    if (appConfig.payments.gateway.name === 'mercadopago') {
      const paymentResponse: IPayment = await _makePaymentWithMercadopago(contract, appConfig, clientPaymentConfig, amount);

      const order = {
        payment_status: paymentResponse.status,
        payment_status_detail: paymentResponse.status_detail,
        payment_attempts: [paymentResponse],
      }

      return order;
    } else {
      throw new CustomError('This site does not have a Gateway associated', 400);
    }
  } else {
    throw new CustomError('This client does not have a Credit Card associated', 400);
  }
}

export async function _refundOrder(siteId: string, orderId: string) {
  const appConfig = await _getAppConfig(siteId);
  const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
  const orderResponse = await DDBB.doc(`business/${siteId}/orders/${orderId}`).get();
  const orderPaymentAttempts = orderResponse.data().payment_attempts;
  console.log('orderPaymentAttempts', orderPaymentAttempts, orderPaymentAttempts[orderPaymentAttempts.length - 1])
  const paymentId = orderPaymentAttempts[orderPaymentAttempts.length - 1].id;
  const refundPaymentResponse = await httpClient.post(`${appConfig.payments.gateway.url}/payments/${paymentId}/refunds?access_token=${apiToken}`);
  const refundedPayment = refundPaymentResponse.data;
  console.log('refundedPayment', refundedPayment);

  // Update order status on Firebase DDBB
  await DDBB.doc(`business/${siteId}/orders/${orderId}`).update({ payment_status: 'refunded' });

  return refundedPayment;
}

export async function _processAllAppsAutopays() {
  // TODO: Fire this function for every app
  const apps = await DDBB.collection(`business`).get();
  const appsArray = apps.docs.map(snapshot => snapshot.data());
  const ddbbTime = moment();
  console.log('_processAllAppsAutopays appsArray', appsArray, ddbbTime);

  for (let i = 0; i < appsArray.length; i++) {
    const appConfig: IAppConfig = appsArray[i].config;

    try {
      // Every app has its own local time based on its appConfig.customization.timezone
      const appTimezone = appConfig.customization.timezone;
      const appBillingHour = appConfig.payments.billing_hour;
      const appHour = ddbbTime.clone().tz(appTimezone).hour();
      console.log('_processAllAppsAutopays', appConfig, appTimezone, appBillingHour, appHour, ddbbTime.hour());

      if (appBillingHour === appHour) {
        await _processOneAppAutopays(appConfig);
      }
    } catch (error) {
      console.log('_processAllAppsAutopays error', error);
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

export async function _processOneAppAutopays(appConfig: IAppConfig) {
  console.log('_processOneAppAutopays', appConfig)
  // TODO: Replace this test Auth call with the admin client account data (username and password)
  // created for us to manage autopays
  const url = `${baseUrl}/usertoken/issue`;
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': appConfig.id,
    }
  };
  let token;

  try {
    const clientEnviromentVariables = await _getClientEnviromentVariables(appConfig.id);
    const tokenRequest = {
      Username: clientEnviromentVariables.username,
      Password: clientEnviromentVariables.password,
    };
    const tokenResponse = await httpClient.post(url, tokenRequest, config);
    token = tokenResponse.data.AccessToken;
    // TODO: Replace this with the call to Mindbody
    const appContracts = await _getContracts(appConfig.id, token);

    // Process All the app contracts
    for (const contract of appContracts) {
      console.log('contract', contract)
      await _processAllContractOrders(contract, appConfig, token);
    }
  } catch (error) {
    console.log('_processOneAppAutopays error', error);
    throw new CustomError(`_processOneAppAutopays error: ${JSON.stringify(error)} - ${error}`, 500);
  }

  // Retry all failed orders
  try {
    await _processFailedContractOrders(contractsMock, appConfig, token);
  } catch (error) {
    throw new CustomError(`_processOneAppAutopays error: ${JSON.stringify(error)} - ${error}`, 500);
  }
}
