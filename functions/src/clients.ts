import { baseUrl, httpClient } from './utils';

export async function _getAllClients(apiKey: string, siteId: string, token: string, searchText?: string, limit?: string, offset?: string) {
  const url = `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`;
  const config = {
    headers: {
    'Api-Key': apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };
  const clientsResponse = await httpClient.get(url, config);

  return clientsResponse;
}
