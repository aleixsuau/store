// TO WORK WITH THIS TESTS:
// npm install chai mocha ts-node @types/chai @types/mocha --save-dev
/// <reference types="../src/index" />
import { expect } from 'chai';
import { _isTodayTheAutopayDay } from './index';
import * as moment from 'moment';


  // ClientsChargedOn: 'OnSaleDate' | 'FirstOfTheMonth' | 'FifteenthOfTheMonth' |
                    // 'LastDayOfTheMonth' | 'FirstOrFifteenthOfTheMonth' | 'FirstOrSixteenthOfTheMonth' |
                    // 'FifteenthOrEndOfTheMonth' | 'SpecificDate';

  // interface IContractAutopaySchedule {
    // FrequencyType: 'SetNumberOfAutopays' | 'MonthToMonth';
    // FrequencyValue: number;
    // FrequencyTimeUnit: 'Weekly' | 'Monthly' | 'Yearly';
  // }


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
      const todayMock = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-1-2020`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`12-1-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-5-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`10-1-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-30-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-8-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-7-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-10-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-15-2020`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`12-15-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-1-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-5-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`10-15-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-16-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-22-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-21-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-15-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-29-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`10-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-30-2020`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`10-31-2020`, `MM-DD-YYYY`);
      const lastAutopay = moment(`10-31-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`12-30-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-5-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, null, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`10-30-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`9-29-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
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
      const todayMock = moment(`10-7-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.true;
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
      const todayMock = moment(`10-6-2019`, `MM-DD-YYYY`);
      const lastAutopay = moment(`9-30-2019`, `MM-DD-YYYY`);
      const appConfig = { test: true } as IAppConfig;

      expect(_isTodayTheAutopayDay(contract, null, lastAutopay, appConfig, todayMock)).to.be.false;
    })
  })
})
