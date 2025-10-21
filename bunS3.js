const { S3Client } = require('bun')
const path = require('path')
const secrets = require('./secrets')
const { s3: config } = require('./config')

const defaultClientConfig = {
  accessKeyId: secrets.linode.accessKeyId,
  secretAccessKey: secrets.linode.secretAccessKey,
  bucket: config.bucketName,
  endpoint: `https://${config.region}.linodeobjects.com`,
}

const getBucket = (bucket) => bucket || config.bucketName

const clientCache = new Map()

const getClient = (bucket) => {
  const targetBucket = getBucket(bucket)
  if (!clientCache.has(targetBucket)) {
    clientCache.set(
      targetBucket,
      new S3Client({
        ...defaultClientConfig,
        bucket: targetBucket,
      }),
    )
  }
  return clientCache.get(targetBucket)
}

const inferContentType = (filePath) => {
  const ext = path.extname(filePath ?? '').toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.wav': 'audio/wav',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

const normalizeKey = (key) => (key || '').replace(/^\/+/, '')

const getPublicUrl = (key, bucket) => {
  const normalizedKey = normalizeKey(key)
  const targetBucket = getBucket(bucket)
  return `https://${targetBucket}.${config.region}.linodeobjects.com/${normalizedKey}`
}

const s3 = {
  async uploadData({ data, key, bucket, contentType, acl = 'public-read', metadata }) {
    try {
      if (!contentType) {
        contentType = inferContentType(key)
      }

      const client = getClient(bucket)

      await client.write(normalizeKey(key), data, {
        type: contentType,
        ...(acl ? { acl } : {}),
      })

      return {
        success: true,
        key,
        bucket: getBucket(bucket),
        contentType,
        publicUrl: getPublicUrl(key, bucket),
      }
    } catch (error) {
      console.error('Upload failed:', error)
      return {
        success: false,
        error: error.message,
        key,
        bucket,
      }
    }
  },

  async uploadFile({ filePath, key, bucket, contentType, acl = 'public-read', metadata }) {
    try {
      const fs = require('fs')
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const data = fs.readFileSync(filePath)
      return await this.uploadData({ data, key, bucket, contentType, acl })
    } catch (error) {
      console.error('Upload file failed:', error)
      return {
        success: false,
        error: error.message,
        key,
        bucket,
      }
    }
  },

  async getPresignedUploadUrl({ key, bucket, contentType, expiresIn = 180, acl = 'public-read' }) {
    if (!contentType) {
      contentType = inferContentType(key)
    }

    const client = getClient(bucket)

    return client.file(normalizeKey(key)).presign({
      method: 'PUT',
      expiresIn,
      type: contentType,
      ...(acl ? { acl } : {}),
    })
  },

  async deleteObject({ key, bucket }) {
    try {
      const client = getClient(bucket)
      await client.delete(normalizeKey(key))
      return {
        success: true,
        key,
        bucket: getBucket(bucket),
        message: `Successfully deleted object: ${key}`,
      }
    } catch (error) {
      console.error('Delete failed:', error)
      return {
        success: false,
        error: error.message,
        key,
        bucket,
      }
    }
  },

  async deleteFile(params) {
    return this.deleteObject(params)
  },

  getPublicUrl,
}

module.exports = s3
