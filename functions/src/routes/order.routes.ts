import * as express from 'express';
import { _login, _getAppConfig, _handleServerErrors, DDBB, _checkMindbodyAuth } from '../utils';
import { _refundOrder } from '../payments';

export const orderRouter = express.Router();

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
    const filteredPayments = filteredPaymentsSnapshot.docs.map((snapshot: any) => snapshot.data());

    res.status(200).json(filteredPayments);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function refundPayment(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const orderId = req.params.id;
  console.log('refundPayment', siteId, token, orderId);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const refundedPayment = await _refundOrder(siteId, orderId);

    res.status(200).json(refundedPayment);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

orderRouter
  .route('/')
  .get(getOrders);

orderRouter
  .route('/:id/refund')
  .post(refundPayment);

