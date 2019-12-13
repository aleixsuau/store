import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios from 'axios';
import * as express from 'express';

// Initialize FB App
admin.initializeApp(functions.config().firebase);
export const baseUrl = `https://api.mindbodyonline.com/public/v6`;
export const DDBB = admin.firestore();
export const httpClient = axios;

export class CustomError extends Error {
  code: number;
  date: string;

  constructor(
    message: string,
    code: number) {
      super(message);
      this.code = code;
      this.date = new Date().toISOString();
      Error.captureStackTrace(this, this.constructor);
  }
}

export function _handleServerErrors(error: any, res: express.Response) {
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

export async function _getClientEnviromentVariables(siteId: string) {
  const aliasMapSnapshot = await DDBB.collection('alias').doc('table').get();
  const aliasMap = aliasMapSnapshot.data();
  const alias = aliasMap[siteId];

  return functions.config()[alias];
}

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

export async function appConfigMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const siteId = req.header('siteId');
  const appConfig = await _getAppConfig(siteId);

  req.app_config = appConfig;

  next();
}

export async function _login(siteId: string, username: string, password: string) {
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
  console.log('tokenResponse', tokenResponse.data);

  return tokenResponse.data;
}

export async function _checkMindbodyAuth(apiKey: string, siteId: string, token: string) {
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

export async function _findOrderByStatus(appConfig: IAppConfig, clientContract: IMindBroClientContract, status: string) {
  console.log('_findOrderByStatus', clientContract);
  const ordersRef = await DDBB
                            .collection(`business/${appConfig.id}/orders`)
                            .orderBy('date_created_timestamp', 'desc')
                            .where('date_created_timestamp', '>=', clientContract.date_created_timestamp)
                            .where('contract_id', '==', clientContract.id)
                            .where('client_id', '==', clientContract.client_id)
                            .where('payment_status', '==', status)
                            .where('delivered', '==', false);

  const ordersSnapshot = await ordersRef.get();
  const orderToUpdate = ordersSnapshot.docs.map(snapshot => snapshot.data())[0] as IOrder;
  console.log('orderToUpdate', orderToUpdate, ordersSnapshot.docs.map(snapshot => snapshot.data()));
  return orderToUpdate;
}

