
import * as UUID from 'uuid/v4';
import { DDBB, CustomError } from './utils';

export async function _saveOrderToDDBB(order: IOrder, contractId: string, clientId: string, appId: string) {
  console.log('_saveOrderToDDBB', order, contractId, clientId, appId)
  // Save the order into orders under the Id of the order (UUID)
  try {
    if (order.id) {
      await DDBB
              .doc(`business/${appId}/orders/${order.id}`)
              .update(order);
    } else {
      const orderToSave = {
        ...order,
        id: UUID(),
      }

      await DDBB
              .collection(`business/${appId}/orders`)
              .doc(`${orderToSave.id}`)
              .set(orderToSave);
    }
  } catch (error) {
    console.log('_saveOrderToDDBB catch', error)
    throw new CustomError(`${JSON.stringify(error)} - ${contractId} - ${clientId} - ${appId} - ${JSON.stringify(order)}`, 500);
  }
}
