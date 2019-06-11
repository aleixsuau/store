import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request';
import * as cors from 'cors';

// Initialize admin
admin.initializeApp(functions.config().firebase);
// Create DDBB
const corsHandler = cors({origin: true});
const baseUrl = `https://api.mindbodyonline.com/public/v6`;
const DDBB = admin.firestore();

function _getApiKey(id: string) {
  return DDBB.collection('sites').doc(id).get().then(doc => {
            console.log('doc', doc)

            return doc;
            /* const apiKey = doc.data().apiKey;
            console.log('apiKey', apiKey)
            if (apiKey === null || apiKey === undefined) {
              return Promise.reject('No ApiKey found');
            } else {
              return apiKey;
            }} */
  });



  /*
  // QUERY
  return DDBB
          .collection('sites')
          .where('id', '==', id)
          .get()
          .then(sitesQuerySnapShot => {
            return sitesQuerySnapShot.docs.map((documentSnapshot) => documentSnapshot.data());
          });
  */
}

export const auth = functions.https.onRequest((req, res) => {
  console.log('Auth req:', req.method, req.body, req);
  if (req.method === 'OPTIONS') { return corsHandler(req, res, () => res.status(200).send())};

  if (req.method === 'POST') {
    const siteId = req.body.siteId;
    const Username = req.body.username;
    const Password = req.body.password;

    return _getApiKey(siteId)
            .then(apikey => {
              console.log('apikey', apikey);
              const headers = {
                'Api-Key': apikey,
                SiteId: siteId,
              };

              return request.post(
                    {
                      url: `${baseUrl}/usertoken/issue`,
                      headers,
                      body: { Username, Password },
                    },
                    (error, response, body) => {
                      console.log('body', body);
                      if (error) {
                        return corsHandler(req, res, () => res.status(401).send({message: 'Unauthorized: 401', error}));
                      } else {
                        return corsHandler(req, res, () => res.status(200).send(body));
                      }
                    });
                  })
                  .catch(error => error);
  }
});

export const clients = functions.https.onRequest((req, res) => {
  console.log('req5', req)
  if (req.method === 'OPTIONS') { return corsHandler(req, res, () => res.status(200).send())};

  if (req.method === 'GET') {
    const siteId = req.body.siteId;
    const token = req.body.token;

    return _getApiKey(siteId)
            .then(apikey => {
              console.log('apikey', apikey);
              const headers = {
                'Api-Key': apikey,
                SiteId: siteId,
                Authorization: token,
              };

            return request.get({
                      url: `${baseUrl}/client/clients`,
                      headers,
                    }, (error, response, body) => {
                      console.log('body', body);
                      return corsHandler(req, res, () => res.status(200).send(body));
                    });
            });

  }
});

