const S3Utils = require('./s3Utils')
const secrets = require('./secrets')

const { s3: config } = require('./config')

// Create an S3 instance with your configuration
const s3 = new S3Utils({
  region: config.region,
  accessKeyId: secrets.linode.accessKeyId,
  secretAccessKey: secrets.linode.secretAccessKey,
  endpoint: `https://${config.region}.linodeobjects.com`,
})

const test = async () => {
  const { default: fetch } = await import('node-fetch')

  const result = await s3.uploadData({
    data: 'Hello, World!',
    key: config.keyPrefix + 'test.txt',
    bucket: config.bucketName,
    contentType: 'text/plain',
    acl: 'public-read',
  })

  console.log(result.publicUrl)

  // fetch the uploaded file to verify

  const response = await fetch(result.publicUrl)
  const text = await response.text()
  console.log('Fetched content:', text)

  // delete the uploaded file
  const deleteResult = await s3.deleteObject({
    key: config.keyPrefix + 'test.txt',
    bucket: config.bucketName,
  })
  console.log('Delete result:', deleteResult)

  // Generate presigned URL for client uploads
  const presignedUrl = await s3.getPresignedUploadUrl({
    key: config.keyPrefix + 'photo.jpg',
    bucket: config.bucketName,
    contentType: 'image/jpeg',
    expiresIn: 300,
  })
}

if (require.main === module) {
  test().catch((err) => {
    console.error('Error:', err)
  })
}

s3.deleteFile = async ({ key, bucket }) => {
  return s3.deleteObject({
    bucket: bucket,
    key: key,
  })
}

module.exports = s3
