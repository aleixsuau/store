/// <reference types="./typings" />

import { baseUrl, DDBB, httpClient, _getAppConfig, _handleServerErrors, _login, CustomError, _findOrderByStatus, _getClientEnviromentVariables } from './utils';
import { _getNextAutopayDate, _getLastAutopayDate, _getDebtAutopays, _isTodayTheAutopayDay, _payOrder  } from './payments';
import { _saveOrderToDDBB } from './orders';
import * as moment from 'moment-timezone';

export const contractsMock: IContract[] = [
  {
    Id: '1',
    Name: 'Contract 1: Every 1 Month | FirstOfTheMonth',
    Description: 'Contract 1 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
    ActionUponCompletionOfAutopays: 'ContractAutomaticallyRenews',
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
    Description: 'Contract 2 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
    Description: 'Contract 3 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
    Description: 'Contract 4 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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

export async function _processAllContractOrders(contract: IContract, appConfig: IAppConfig, token: string) {
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
    const skipPayment = currentClientContract.status === 'activation_pending';

    console.log('CURRENT CLIENT: ', i, currentClientContract);
    // When the IContract.status is 'activation_pending' the payment was done in advance so
    // we don't need to calculate the next autopay from the 'last_autopay', we just need to
    // check if today is === the firstAutopayDate to set to
    // deliver the IContract items and set its status to 'active'
    const currentClientContractDateFrom = currentClientContract.status !== 'activation_pending' && currentClientContract.last_autopay ?
                                            moment(currentClientContract.last_autopay) :
                                            null;
    const startDate = currentClientContract.start_date && moment(new Date(currentClientContract.start_date));
    console.log('startDate', startDate);

    if (!_isTodayTheAutopayDay(contract, startDate, currentClientContractDateFrom, appConfig)) {
      continue;
    }

    // Order the contract
    const contractOrder: IOrder = await _processOneContractOrder(contract, currentClientContract.client_id, currentClientContract, appConfig, token, null, skipPayment);
    console.log('_processAllContractOrders CONTRACT ORDER', i, contractOrder)

    await _updateContractAfterProcessOrder(appConfig, contractOrder, currentClientContract, contract);
  }
}

export async function _processOneContractOrder(
  contract: IContract,
  clientId: string,
  clientContract: IMindBroClientContract,
  appConfig: IAppConfig,
  token: string,
  order?:IOrder,
  skipPayment?: boolean,
  skipDeliver?: boolean,
  throwIfPaymentFails?: boolean,
  seller?: IUser,
  orderAmount?: number,
): Promise<IOrder> {
  /** EXPLANATION
   * This function varies its output depending on the method that calls it:
   * - addContract:
   *   If the payment_status === 'approved', it creates a new IOrder and the IContract,
   *   else throws an error
   * - _processAllContracts:
   *   If the payment_status === 'approved' && !skipPayment, creates a new IOrder,
   *   If the payment_status === 'approved' && skipPayment, updates an IOrder
   *   If error && (IOrder.id || clientContract.status === 'activation_pending'), updates an IOrder
   *        with the error on payment_attemps
   *   else creates a new IOrder with the error on payment_attemps,
   * - _processFailedContractOrders:
   *   Allways updates the IOrder (payment_status === 'approved', payment_status !== 'approved' and error).
   *   If the IOrder.payment_attemps.length > maxRetries, IOrder.payment_status = 'canceled'
   */

  console.log('_processOneContractOrder', clientId, token, order, skipPayment, skipDeliver, throwIfPaymentFails, seller, contract, appConfig);
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
  const newOrder: IOrder = {
    id: null,
    date_created: appConfig.test && appConfig.today_test_mock ?
                    moment(appConfig.today_test_mock).toISOString() :
                    moment().toISOString(),
    date_created_timestamp: new Date(),
    client_id: clientId,
    contract_id: contract.Id,
    delivered: false,
    delivery_attempts: [],
    shopping_cart: null,
    payment_status: skipPayment ? 'approved' : null,
    payment_status_detail: null,
    payment_attempts: [],
    seller: seller || null,
  };
  const maxRetries = appConfig.payments.number_of_retries;
  // Don't retry canceled IOrders
  let orderToSave = order && order.payment_status !== 'canceled' ?
                      order :
                      newOrder;

  try {
    // If the IContract has not been paid beforehand ('activation_pending')
    // make the payment and then purchase the products on Mindbody (deliver them)
    // If the IContract has been paid beforehand ('activation_pending')
    // just purchase the products on Mindbody
    if (!skipPayment) {
      const paidOrder = await _payOrder(contract, clientId, appConfig, orderAmount);
      orderToSave = {
        ...orderToSave,
        payment_status: paidOrder.payment_status,
        payment_status_detail: paidOrder.payment_status_detail,
        payment_attempts: [...orderToSave.payment_attempts, ...paidOrder.payment_attempts ],
      }
      console.log('_processOneContractOrder paidOrder', paidOrder, orderToSave)
    }

    // Only deliver approved IOrders
    if (!skipDeliver && orderToSave.payment_status === 'approved') {
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

      orderToSave = {
        ...orderToSave,
        delivered: true,
        delivery_attempts: [cartResponse.data],
        // TODO: Do we need to save the shopping_cart???
        shopping_cart: cartResponse.data.ShoppingCart,
      }
      console.log('_processOneContractOrder cartResponse', orderToSave)
    }

    if (throwIfPaymentFails && orderToSave.payment_status !== 'approved') {
      console.log('_processOneContractOrder throwIfPaymentFails CustomError', throwIfPaymentFails, typeof throwIfPaymentFails, orderToSave)
      throw new CustomError(`Mercadopago ${ orderToSave.payment_status ? `: ${mercadoPagoMessages[orderToSave.payment_status_detail]} ` : ''}`, 400);
    } else {
      console.log('_processOneContractOrder ELSE', clientContract, orderToSave)
      // skipPayment (ie: 'activation_pending') IContracts have being already paid, so the autopays_counter
      // and last_autopay have been already updated but we need to update the related IOrder delivered
      // status and add the shopping_cart
      if (clientContract.status === 'activation_pending') {
        const activationPendingOrder = await _findOrderByStatus(appConfig, clientContract, 'approved');

        orderToSave = {
          ...activationPendingOrder,
          delivered: orderToSave.delivered,
          delivery_attempts: [...activationPendingOrder.delivery_attempts, ...orderToSave.delivery_attempts],
          shopping_cart: orderToSave.shopping_cart,
        }

        console.log('_processOneContractOrder activation_pending', orderToSave)
      }

      if (orderToSave.payment_status !== 'approved' && orderToSave.payment_attempts.length >= maxRetries) {
        orderToSave = {
          ...orderToSave,
          payment_status: 'canceled',
        }
      }

      console.log('_processOneContractOrder PRE _saveOrderToDDBB', _saveOrderToDDBB)
      await _saveOrderToDDBB(orderToSave, contract.Id, clientId, appConfig.id);
    }

    console.log('_processOneContractOrder order:', orderToSave);

    return orderToSave;
  } catch (error) {
    console.log('_processOneContractOrder ERROR 0:', throwIfPaymentFails, error);
    if (throwIfPaymentFails) {
      throw new CustomError(error.message || JSON.stringify(error), error.code || 500);
    } else {
      // If we are processing an IOrder that already existed, that has an id (ie: failed order)
      // update it with the error
      // If we are processing an order for a IContract with status 'activation_pending',
      // find the related IOrder and update it with the error
      // If it's the first payment attempt, save a new IOrder with error
      if (orderToSave.id) {
        orderToSave = {
          ...orderToSave,
          ...!skipPayment && { payment_attempts: [ orderToSave.payment_attempts, error ] },
          ...!skipDeliver && { delivery_attempts: [...orderToSave.delivery_attempts, error] },
        }
      } else if (clientContract.status === 'activation_pending') {
        const activationPendingOrder = await _findOrderByStatus(appConfig, clientContract, 'approved');

        orderToSave = {
          ...activationPendingOrder,
          ...!skipPayment && { payment_attempts: [ activationPendingOrder.payment_attempts, error ] },
          ...!skipDeliver && { delivery_attempts: [...activationPendingOrder.delivery_attempts, error] },
        }
      } else {
        orderToSave = {
          id: null,
          date_created: appConfig.test && appConfig.today_test_mock ?
                          moment(appConfig.today_test_mock).toISOString() :
                          moment().toISOString(),
          date_created_timestamp: new Date(),
          client_id: clientId,
          contract_id: contract.Id,
          shopping_cart: null,
          delivered: false,
          delivery_attempts: skipDeliver ? null : [{ error: JSON.stringify(error.response || error.message || error) }],
          payment_status: 'error',
          payment_status_detail: JSON.stringify(error.response || error.message || error),
          payment_attempts: skipPayment ? null : [{ error: JSON.stringify(error.response || error.message || error) }],
          seller: null,
        }
      }
      console.log('_processOneContractOrder ERROR', error.message, orderToSave);
      if (orderToSave.payment_status !== 'approved' && orderToSave.payment_attempts.length >= maxRetries) {
        orderToSave = {
          ...orderToSave,
          payment_status: 'canceled',
        }
      }

      await _saveOrderToDDBB(orderToSave, contract.Id, clientId, appConfig.id);

      return orderToSave;
    }
  }
}

export async function _processFailedContractOrders(contractsCatalog: IContract[], appConfig: IAppConfig, token: string) {
  console.log('_processFailedContractOrders appConfig', appConfig)
  // TODO: Limit the orders to the last month?
  const appOrders = await DDBB.collection(`business/${appConfig.id}/orders`).get();
  const appOrdersArray = appOrders.docs.map(snapshot => snapshot.data()) as IOrder[];
  console.log('appOrdersArray', appOrdersArray)
  // Canceled orders are the ones that have finished the max number
  // of retries (appConfig.payments.number_of_retries;)
  const failedOrders: IOrder[] = appOrdersArray.filter(order => order.payment_status !== 'approved' && order.payment_status !== 'canceled');
  console.log('failedOrders', failedOrders);

  for (let i = 0; i < failedOrders.length; i++) {
    const failedOrder: IOrder = failedOrders[i];
    const maxRetries = appConfig.payments.number_of_retries;
    const actualRetries = failedOrder.payment_attempts.length;
    console.log('failedOrder', failedOrder, maxRetries, actualRetries);
    const failedContract: IContract = contractsCatalog.find(contract => contract.Id === failedOrder.contract_id);
    const clientContractResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`).get();
    const clientContract = clientContractResponse.data() as IMindBroClientContract;
    console.log('failedContract', failedContract, clientContract);
    const skipPayment = clientContract.status === 'activation_pending';
    const newContractOrder = await _processOneContractOrder(failedContract, failedOrder.client_id, clientContract, appConfig, token, failedOrder, skipPayment);
    console.log('CONTRACT ORDER', i, newContractOrder, failedOrder.id, failedOrder);

    await _updateContractAfterProcessOrder(appConfig, newContractOrder, clientContract, failedContract);
  }
}

export async function _updateContractAfterProcessOrder(appConfig: IAppConfig, contractOrder: IOrder, clientContract: IMindBroClientContract, contract: IContract) {
  console.log('_updateContractAfterProcessOrder', contractOrder, clientContract, contract)
  const skipPayment = clientContract.status === 'activation_pending';
  let clientContractUpdate: {[key: string]: any};

  // active, payment_pending, activation_pending, paused, paused_no_payment, canceled, terminated

  if (contractOrder.payment_status === 'approved') {
    // If IContract status is 'payment_pending' or 'activation_pending'
    // we have to set it to 'active' once it is payed and delivered
    if (clientContract.status === 'payment_pending' ||
        clientContract.status === 'paused' ||
        clientContract.status === 'paused_no_payment') {
      clientContractUpdate = {
        ...clientContractUpdate,
        status: contractOrder.delivered ? 'active' : 'activation_pending',
      };
    }

    if (clientContract.status === 'activation_pending' &&
        contractOrder.delivered) {
      clientContractUpdate = {
        ...clientContractUpdate,
        status: 'active',
      };
    }

    if (!skipPayment) {
      let lastAutopay;

      if (clientContract.status === 'activation_pending' || clientContract.status === 'paused') {
        // If IOrder.payment_status === 'approved' && IOrder.delivered === false
        // then as false (ie: it was an instantPayment)
        // and the clientContract.status === 'activation_pending'
        // So we know the last_autopay will have to be _getFirstAutopayDate
        // Because the first payment was made in advance (instantPayment)
        // we set the last_payment to the next autopay date (_getFirstAutopayDate)
        // to calculate the next autopay dates from it. If not we'd charge it double,
        // when the IContract is purchased, and then when arrives the first IContract.clientsChargeOn
        // Also, if the clientContract.status === 'paused', here we are resuming the contract
        // and we have already paid (instantPayment), so we are in the same case.
        lastAutopay = _getNextAutopayDate(contract, null, appConfig).toISOString();
      } else if (clientContract.status === 'paused_no_payment') {
        // If the clientContract.status === 'paused_no_payment', then
        // we are resuming (reactivating) it after the payment of the debt, then
        // we have to set the last_autopay to the last autopay date that would have been
        // charged if the contract would have been active. (last_autopay is the date used
        // to check _isTodayTheAutopayDate...)
        lastAutopay = _getLastAutopayDate(contract, null, appConfig).toISOString();
      } else {
        lastAutopay = appConfig.test && appConfig.today_test_mock?
                        appConfig.today_test_mock :
                        moment().toISOString();
      }

      clientContractUpdate = {
        ...clientContractUpdate,

        last_autopay: lastAutopay,
      };

      if (contract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays') {
        let autopaysCounter = clientContract.autopays_counter - 1;

        // If the clientContract.status === 'paused_no_payment',
        // the we need to calculate the debt autopays in order to subtract them
        // from the autopays_counter when the contract is resumed
        if (clientContract.status === 'paused_no_payment') {
          const debtAutopays = await _getDebtAutopays(contract, clientContract, appConfig);
          autopaysCounter = clientContract.autopays_counter - debtAutopays;
        }

        clientContractUpdate = {
          ...clientContractUpdate,
          autopays_counter:  autopaysCounter,
        }

        if (clientContractUpdate.autopays_counter === 0) {
          if (contract.ActionUponCompletionOfAutopays === 'ContractAutomaticallyRenews') {
            clientContractUpdate.autopays_counter = contract.NumberOfAutopays;
          } else {
            // The autopaysCounter will show the debt of the client
            clientContractUpdate.status = 'terminated';
          }
        }
      }
    }
  } else if (contractOrder.payment_status === 'canceled') {
    // Pause the IContract when the payment retries exceed the appConfig.payments.number_of_retries
    clientContractUpdate = { ...clientContractUpdate, status: 'paused_no_payment' };
  }

  if (clientContractUpdate) {
    console.log('clientContractUpdate', clientContractUpdate);
    await DDBB
            .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientContract.client_id}`)
            .update(clientContractUpdate);
    if (clientContractUpdate.status) {
      // Update the client contract status
      await DDBB
              .doc(`business/${appConfig.id}/clients/${clientContract.client_id}`)
              .update({[`contracts.${contract.Id}.status`]: clientContractUpdate.status});
    }
  }
}

export async function _getContracts(siteId: string, token?: string): Promise<IContract[]> {
  if (token) {
    // Call directly to Mindbody to get the IContracts
    return Promise.resolve(contractsMock);
  } else {
    // Get the token and then get the contract
    const clientEnviromentVariables = await _getClientEnviromentVariables(siteId);
    console.log('_getContracts clientEnviromentVariables', token, clientEnviromentVariables);
    const tokenResponse = await _login(siteId, clientEnviromentVariables.username, clientEnviromentVariables.password);
    const newToken = tokenResponse.data;
    console.log(' _getContracts token', newToken);

    return Promise.resolve(contractsMock);
  }
}
