const { Credentials } = require('aws-sdk')
const S3 = require('aws-sdk/clients/s3')

const secrets = require('./secrets')
const config = secrets

const s3 = new S3({
  region: config.LINODE_S3_REGION,
  endpoint: `${config.LINODE_S3_REGION}.linodeobjects.com`,
  credentials: new Credentials({
    accessKeyId: secrets.LINODE_ACCESS_KEY,
    secretAccessKey: secrets.LINODE_SECRET_KEY,
  }),
  sslEnabled: true,
  signatureVersion: 'v4',
  s3DisableBodySigning: true,
  s3ForcePathStyle: true,
  signatureCache: false,
  params: {
    Headers: {
      Authorization: `Bearer ${secrets.LINODE_OBJECT_STORAGE_TOKEN}`,
    },
  },
})

const getPresignedURL = (key, contentType, bucket) => {
  return s3.getSignedUrlPromise('putObject', {
    Bucket: bucket || secrets.LINODE_BUCKET_NAME,
    ContentType: contentType,
    Key: key,
    Expires: 180,
    ACL: 'public-read',
  })
}

module.exports = getPresignedURL
