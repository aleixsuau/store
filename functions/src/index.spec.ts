// TO WORK WITH THIS TESTS:
// npm install chai mocha ts-node @types/chai @types/mocha --save-dev
/// <reference types="../src/index" />
import { expect } from 'chai';
import { _isTodayTheAutopayDay } from './index';
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
 *
 * TEST AUTOPAYS_COUNTER WHEN FINISH
 *
 *
 * TESTING ICONTRACT PAUSE/RESUME
 *
 * - When pause, the IClientMindBroContract.status = 'paused', the client/id/contracts/id.status = 'paused'
 * - When resume:
 *    - If the previous IOrder has expired it process a new IOrder +
 *        - if (_isTodayTheAutopayDate) { IClientMindBroContract.status = 'active', the client/id/contracts/id.status = 'active' }
 *        - else { IClientMindBroContract.status = 'activation_pending', the client/id/contracts/id.status = 'activation_pending' }
 *          - Triggering billingCycle on the clientsChargedOn date should:
 *              - IOrder.delivered = true
 *              - IClientMindBroContract.status = 'active', the client/id/contracts/id.status = 'active'
 *
 *    - If previous IOrder is still active, it set the IContracts.status = active &&
 *      start_date = to the next autopay first date (excluding today to avoid the case
 *      that the IClientMindBroContract is resumed on the clientChargeOnDay of the current IOrder)
*          - Triggering billingCycle on the clientsChargedOn date should:
 *              - IOrder.delivered = true
 *              - IClientMindBroContract.status = 'active', the client/id/contracts/id.status = 'active'
 *
 * TESTING ICONTRACT PAUSE_NO_PAYMENT/RESUME
 *
 *
 *
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
        today_test_mock: '9-1-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay the 9-1-2020', () => {
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
        today_test_mock: '9-1-2020',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the next autopay the 12-1-2010', () => {
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
        today_test_mock: '12-1-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    });

    it('Monthly: It should do the first autopay the 9-1-2019', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-1-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Monthly: It should not do the first autopay the 9-1-2019 (because today is 9-5-2019)', () => {
      const contract = {
        ClientsChargedOn: 'FirstOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-5-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Monthly: It should do the next autopay the 10-1-2019', () => {
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
        today_test_mock: '10-1-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should not do the next autopay the 9-30-2019 (because lastAutopay was 9-1-2019)', () => {
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
        today_test_mock: '9-30-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })

    it('Weekly: It should do the next autopay the 9-8-2019', () => {
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
        today_test_mock: '9-8-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should not do the next autopay the 9-7-2019 (because lastAutopay was 9-1-2019)', () => {
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
        today_test_mock: '9-7-2019',
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
        today_test_mock: '9-15-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the first autopay the 9-10-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-10-2019',
        test: true
      } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Yearly: It should do the next autopay the 9-15-2020', () => {
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
        today_test_mock: '9-15-2020',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the next autopay the 12-15-2010', () => {
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
        today_test_mock: '12-15-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    });

    it('Monthly: It should do the first autopay the 9-15-2019', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-15-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Monthly: It should not do the first autopay the 9-5-2019 (because today is 9-5-2019)', () => {
      const contract = {
        ClientsChargedOn: 'FifteenthOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-5-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Monthly: It should do the next autopay the 10-15-2019', () => {
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
        today_test_mock: '10-15-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should not do the next autopay the 9-16-2019 (because lastAutopay was 9-15-2019)', () => {
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
        today_test_mock: '9-16-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })

    it('Weekly: It should do the next autopay the 9-22-2019', () => {
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
        today_test_mock: '9-22-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should not do the next autopay the 9-21-2019 (because lastAutopay was 9-1-2019)', () => {
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
        today_test_mock: '9-21-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })
  })

  describe('LastDayOfTheMonth', () => {
    it('Yearly: It should do the first autopay the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-30-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the first autopay the 9-29-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-29-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Yearly: It should not do the first autopay the 10-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '10-30-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Yearly: It should do the next autopay the 9-30-2020', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '9-30-2020',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should do the next autopay the 10-31-2020', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`10-31-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '10-31-2020',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    });

    it('Yearly: It should not do the next autopay the 12-30-2010', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Yearly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '12-30-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    });

    it('Monthly: It should do the first autopay the 9-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-30-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.true;
    });

    it('Monthly: It should not do the first autopay the 9-5-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const appConfig = {
        today_test_mock: '9-5-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig)).to.be.false;
    });

    it('Monthly: It should do the next autopay the 10-30-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '10-30-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Monthly: It should not do the next autopay the 9-29-2019 (because lastAutopay was 9-15-2019)', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Monthly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '9-29-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })

    it('Weekly: It should do the next autopay the 10-7-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '10-7-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.true;
    })

    it('Weekly: It should not do the next autopay the 10-6-2019', () => {
      const contract = {
        ClientsChargedOn: 'LastDayOfTheMonth',
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 1,
          FrequencyTimeUnit: 'Weekly',
        }
      } as IContract;

      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = {
        today_test_mock: '10-6-2019',
        test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig)).to.be.false;
    })
  })
  })


