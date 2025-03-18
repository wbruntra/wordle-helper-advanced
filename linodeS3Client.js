const secrets = require('./secrets')
const config = require('./config')

const { Credentials } = require('aws-sdk')
const S3 = require('aws-sdk/clients/s3')

const secrets = process.env
const config = process.env

const linodeS3Client = new S3({
  region: config.LINODE_S3_REGION,
  endpoint: config.LINODE_S3_ENDPOINT,
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

module.exports = linodeS3Client
