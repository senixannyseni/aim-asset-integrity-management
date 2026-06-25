import { S3Client } from '@aws-sdk/client-s3';
import { config } from '../../config/env.js';

export function createS3Client(): S3Client {
  return new S3Client({
    endpoint: config.objectStorage.endpoint,
    region: config.objectStorage.region,
    forcePathStyle: config.objectStorage.forcePathStyle,
    credentials: {
      accessKeyId: config.objectStorage.accessKeyId,
      secretAccessKey: config.objectStorage.secretAccessKey
    }
  });
}
