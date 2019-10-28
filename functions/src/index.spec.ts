// TO WORK WITH THIS TESTS:
// npm install chai mocha ts-node @types/chai @types/mocha --save-dev
/// <reference types="../src/index" />
import { expect } from 'chai';
import { _isTodayTheAutopayDay, _getFirstAutopayDate, _getDebtAutopays } from './index';
import * as moment from 'moment';


/**
 * MANUAL/UI TESTS
 *
 * RETAIL:
 * - Default:
 *   - TodayTestMock: match IContract.ClientsChargeOn
 *       Should:
 *       IMindBroClientContract.status === active
 *       IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter - 1
 *       IMindBroClientContract.last_autopay === TodayTestMock
 *
 *       IOrder.delivered === true
 *       IOrder.payment_status === 'approved'
 *
 *   - TodayTestMock: no match IContract.ClientsChargeOm
 *     Should:
 *     IMindBroClientContract.status === 'payment_pending';
 *     IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter;
 *     IMindBroClientContract.last_autopay === null
 *
 *     No new Order
 *
 * - StartDate
 *    - StartDate match TodayTestMock
 *        Should:
 *        IMindBroClientContract.status === active
 *        IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter - 1
 *        IMindBroClientContract.last_autopay === TodayTestMock
 *
 *        IOrder.delivered === true
 *        IOrder.payment_status === 'approved'
 *
 *    - StartDate NO match TodayTestMock
 *      Should:
 *      IMindBroClientContract.status === 'payment_pending';
 *      IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter;
 *      IMindBroClientContract.last_autopay === null
 *
 *      No new Order
 *
 * - Instant
*    - TodayTestMock: match IContract.ClientsChargeOn
 *        Should:
 *        IMindBroClientContract.status === active
 *        IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter - 1
 *        IMindBroClientContract.last_autopay === TodayTestMock
 *
 *        IOrder.delivered === true
 *        IOrder.payment_status === 'approved'
 *
 *   - TodayTestMock: NO match IContract.ClientsChargeOn
 *        Should:
 *        IMindBroClientContract.status === 'activation_pending'
 *        IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter - 1
 *        IMindBroClientContract.last_autopay === TodayTestMock
 *
 *        IOrder.delivered === false
 *        IOrder.payment_status === 'approved'
 *
 *     Billing Cycle:
 *     TodayTestMock === IContract.ClientsChargeOn && IMindBroClientContract.status === 'activation_pending'
 *        Should:
 *        IMindBroClientContract.status === 'active'
 *
 *        No New IOrder:
 *        IOrder.delivered === true
 *
 *     TodayTestMock: NO match IContract.ClientsChargeOn
 *        Should:
 *        IMindBroClientContract.autopays_counter === IMindBroClientContract.autopays_counter
 *        IMindBroClientContract.last_autopay === IMindBroClientContract.last_autopay
 *
 *        No new IOrder
 *
 *
 * TEST AUTOPAYS_COUNTER WHEN FINISH
 *  - Every time _processOneContractOrder without skipPayment IMindBroContracts.autopays_counter --
 *  - If IMindBroContracts.autopays_counter === 0:
 *    - If IContract.ActionUponCompletionOfAutopays === 'ContractExpires'
 *      - IMindBroContracts.status = 'terminated'
 *    - If IContract.ActionUponCompletionOfAutopays === 'ContractAutomaticallyRenews'
 *      - IMindBroContracts.autopays_counter = IContract.NumberOfAutopays
 *
 *    Edge Cases:
 *    -  When the IMindBroContracts is resumed from 'paused_no_payment' status,
 *       autopays_counter has to decrease 1 for every autopay period debt
 *
 *
 * TESTING ICONTRACT PAUSE/RESUME
 *
 * - When pause, the IMindBroClientContract.status = 'paused', the client/id/contracts/id.status = 'paused'
 * - When resume:
 *    - If the previous IOrder has expired it process a new IOrder +
 *        - if (_isTodayTheAutopayDate) { IMindBroClientContract.status = 'active', the client/id/contracts/id.status = 'active' }
 *          + IOrder.delivered = true
 *          + IMindBroClientContract.last_autopay = _getNextAutopayDate
 *          + IMindBroClientContract.autopays_counter--
 *        - else { IMindBroClientContract.status = 'activation_pending', the client/id/contracts/id.status = 'activation_pending' }
 *          + IOrder.delivered = false
 *          + IMindBroClientContract.last_autopay = _getNextAutopayDate *
 *          + IMindBroClientContract.autopays_counter-- *
 *          - Triggering billingCycle on the clientsChargedOn date should:
 *              - IOrder.delivered = true
 *              - IMindBroClientContract.status = 'active', the client/id/contracts/id.status = 'active'
 *
 *
 *    - If previous IOrder is still active, it set the IContracts.status = active
*          - Triggering billingCycle on the clientsChargedOn date should:
 *              - IOrder.delivered = true
 *              - IMindBroClientContract.status = 'active', the client/id/contracts/id.status = 'active'
 *
 *    - Edge cases:
 *      If resuming the payment fails:
 *          - Creates a 'canceled' IOrder, so it doesn't retry and throws so the admin knows it instantly
 *          - IContract.status === 'paused_no_payment'
 *
 * TESTING ICONTRACT PAUSE_NO_PAYMENT/RESUME
 *      - IMindBroClientContract.status = 'activation_pending', the client/id/contracts/id.status = 'activation_pending'
 *        (We always pay and deliver the IOrder because it should be already active and delivered but the payment failed)
 *          + IMindBroClientContract.last_autopay = _getNextAutopayDate
 *          - Triggering billingCycle on the clientsChargedOn date should:
 *              - IOrder.delivered = true
 *              - IMindBroClientContract.status = 'active', the client/id/contracts/id.status = 'active'
 *
 *
 *  TEST _isTodayTheAutopayDay:
 *   - For every IContracts.ClientsChargedOn type
 *      - Test for every FrequencyTimeUnit: Yearly, Monthly & Weekly
 *      - Test for FrequencyValue: 1, 2, 3
 *
 *   * There is no need to test the FrequencyTimeUnit & FrequencyValue on
 *     every ClientsChargedOn type because it simply adds FrequencyValue *
 *     FrequencyTimeUnit to a date with moment, so it is only tested on
 *     2 types.
 *
 *  TEST _getFirstAutopayDate
 *
 * TODOs:
 *    - Test _getLastAutopayDate
 *    - CRUD Contracts
 *    - CRUD Clients
 */


describe('_isTodayTheAutopayDay', () => {
  describe('FirstOfTheMonth', () => {
    it('Yearly: It should do the first autopay the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the next autopay on 12-1-2010', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('12-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    });

    it('Yearly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-1-2020', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay 2 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-1-2021', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay 3 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-1-2022', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Monthly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('10-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should do the next autopay 2 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('11-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should do the next autopay 3 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('12-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should not do the next autopay the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })

    it('Weekly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-8-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should do the next autopay 2 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should do the next autopay 3 period after', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-22-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should not do the next autopay the 9-7-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-7-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })
  })

  describe('FifteenthOfTheMonth', () => {
    it('Yearly: It should do the first autopay the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the next autopay on 12-1-2010', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('12-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    });

    it('Yearly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-15-2020', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay 2 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-15-2021', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay 3 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-15-2022', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Monthly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('10-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should do the next autopay 2 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('11-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should do the next autopay 3 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('12-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should not do the next autopay the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-14-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })

    it('Weekly: It should do the next autopay 1 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-22-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should do the next autopay 2 periods after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 2,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-29-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should do the next autopay 3 period after', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 3,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('10-6-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should not do the next autopay the 9-7-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: moment('9-7-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })
  })

  describe('LastDayOfTheMonth', () => {
    it('It should do the first autopay the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay the 10-31-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('10-31-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should not do the first autopay the 9-29-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-29-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });
  })

  describe('FirstOrFifteenthOfTheMonth', () => {
    it('It should do the first autopay the first of the month', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay the fifteenth of the month', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should not do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('25-12-2018', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });
  })

  describe('FirstOrSixteenthOfTheMonth', () => {
    it('It should do the first autopay the first of the month', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay the Sixteenth of the month', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should not do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('25-12-2018', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });
  })

  describe('FifteenthOrEndOfTheMonth', () => {
    it('It should do the first autopay the fifteenth of the month', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay at the end of the month', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay at the end of the month', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('10-31-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should not do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('10-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });
  })

  describe('OnSaleDate', () => {
    it('It should do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'OnSaleDate',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'OnSaleDate',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-3-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });
  })

  describe('SpecificDate', () => {
    it('It should do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        },
        ClientsChargedOnSpecificDate: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        },
        ClientsChargedOnSpecificDate: moment('9-11-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-11-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('It should not do the first autopay today', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        },
        ClientsChargedOnSpecificDate: moment('9-11-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-10-2019', `MM-DD-YYYY`).toISOString(),
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });
  });
});

describe('_getFirstAutopayDate', () => {
  describe('FirstOfTheMonth', () => {
    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 10-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-2-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('10-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('FifteenthOfTheMonth', () => {
    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 10-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('10-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('LastDayOfTheMonth', () => {
    it('It should be the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-30-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-30-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-30-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('FirstOrFifteenthOfTheMonth', () => {
    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('8-31-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-2-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 10-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrFifteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('10-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('FirstOrSixteenthOfTheMonth', () => {
    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('8-31-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-16-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-2-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-16-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-16-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-16-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 10-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOrSixteenthOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-17-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('10-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('FifteenthOrEndOfTheMonth', () => {
    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-8-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-30-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-30-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-30-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 10-31-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOrEndOfTheMonth',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('10-16-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('10-31-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('OnSaleDate', () => {
    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'OnSaleDate',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'OnSaleDate',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-15-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-15-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 9-22-2019', () => {
      const contract = {
        ClientsChargedOn: 'OnSaleDate',
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-22-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-22-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });

  describe('SpecificDate', () => {
    it('It should be the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        ClientsChargedOnSpecificDate: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('9-1-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('9-1-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 11-22-2019', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        ClientsChargedOnSpecificDate: moment('11-22-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('11-22-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('11-22-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })

    it('It should be the 1-2-2019', () => {
      const contract = {
        ClientsChargedOn: 'SpecificDate',
        ClientsChargedOnSpecificDate: moment('1-2-2019', `MM-DD-YYYY`).toISOString(),
      } as IContract;

      const appConfig = {
        today_test_mock: moment('1-2-2019', `MM-DD-YYYY`).toISOString(),
        test: true
      } as IAppConfig;
      const firstAutopayDate = _getFirstAutopayDate(contract, appConfig);
      const expectedDate = moment('1-2-2019', `MM-DD-YYYY`);

      expect(firstAutopayDate.isSame(expectedDate, 'day')).to.be.true;
    })
  });
});


