/**
 * BACKUP PROCESS: https://blog.emad.in/automate-firestore-db-backups
 * For the backup to work, make sure the following is done:
 *
 * - Set permission: https://console.cloud.google.com/iam-admin/iam
 *    `Datastore -> Cloud Datastore Import Export Admin`
 *    on the service account IAM role
 * - Set permission: https://console.cloud.google.com/storage/browser
 *    `Firebase Admin and Storage Admin`
 *    on the service account
 * - Create a bucket folder with the same name as
 *    the value of BACKUP_FOLDER variable
 *
 * - TO RESTORE A BACKUP:
 *   In order to backup to any older backup copy, we have to:
 *   - Go to: https://console.cloud.google.com/home/dashboard?project=mindbrody&cloudshell=true
 *   - In the console: gcloud firestore import gs://mindbrody.appspot.com/firestore_backups/2019-12-16T12:37:31.747Z[dateToBeRestored].json
 */

import * as GoogleAuth from 'google-auth-library';

// process.env.FIREBASE_CONFIG is automatically populated in the
// cloud functions runtime, however we need to parse it, as a json string
const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG || '{}')
// the folder that was created in the default storage bucket
const BACKUP_FOLDER = 'firestore_backups'

export async function backup() {
  console.log('start firebase backup')

  const auth = new GoogleAuth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
  })
  const client = await auth.getClient();
  const {storageBucket, projectId} = FIREBASE_CONFIG;
  console.log('storageBucket, projectId', storageBucket, projectId, FIREBASE_CONFIG)
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`;
  const backupFileName = new Date().toISOString();
  const backupUrl = `gs://${storageBucket}/${BACKUP_FOLDER}/${backupFileName}.json`;

  const backUpResult = await client.request({
    url,
    method: 'POST',
    data: {
      outputUriPrefix: backupUrl,
    },
  });

    console.log('backUpResult', backUpResult)


  console.log('end firebase backup')
}
