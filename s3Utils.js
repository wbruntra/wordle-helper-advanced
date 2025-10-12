const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const fs = require('fs')
const path = require('path')

/**
 * S3-compatible object storage client class
 * Supports both Linode Object Storage and AWS S3
 */
class S3Utils {
  /**
   * Create an S3Utils instance
   * @param {Object} config - Configuration options
   * @param {string} config.region - AWS/Linode region
   * @param {string} config.accessKeyId - Access key ID
   * @param {string} config.secretAccessKey - Secret access key
   * @param {string} [config.endpoint] - Custom endpoint (auto-generated for Linode if not provided)
   * @param {boolean} [config.forcePathStyle=true] - Force path-style addressing
   */
  constructor(config = {}) {
    // Merge with environment variables as fallback
    this.config = {
      region: config.region || process.env.LINODE_BUCKET_REGION || process.env.AWS_REGION,
      accessKeyId:
        config.accessKeyId || process.env.LINODE_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey:
        config.secretAccessKey ||
        process.env.LINODE_S3_SECRET_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle !== undefined ? config.forcePathStyle : true,
    }

    // Validate required configuration
    if (!this.config.region || !this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error(
        'Missing required S3 configuration. Please provide region, accessKeyId, and secretAccessKey.',
      )
    }

    // Auto-generate endpoint for Linode Object Storage if not provided
    if (!this.config.endpoint) {
      this.config.endpoint = `https://${this.config.region}.linodeobjects.com`
    }

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    })
  }

  /**
   * Infer content type from file extension
   * @param {string} filePath - File path or filename
   * @returns {string} MIME type
   */
  inferContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase()
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

  /**
   * Generate public URL for a given key and bucket
   * @param {string} key - Object key
   * @param {string} bucket - Bucket name
   * @returns {string} Public URL
   */
  getPublicUrl(key, bucket) {
    return `https://${bucket}.${this.config.region}.linodeobjects.com/${key}`
  }

  /**
   * Upload a local file to S3
   * @param {Object} params - Upload parameters
   * @param {string} params.filePath - Local path to the file
   * @param {string} params.key - Object key (path) in the bucket
   * @param {string} params.bucket - Bucket name
   * @param {string} [params.contentType] - MIME type (auto-detected if not provided)
   * @param {string} [params.acl='public-read'] - Access control list
   * @param {Object} [params.metadata] - Additional metadata to store with the object
   * @returns {Promise<Object>} Upload result with publicUrl
   */
  async uploadFile({
    filePath,
    key,
    bucket,
    contentType = null,
    acl = 'public-read',
    metadata = null,
  }) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      // Read the file
      const fileContent = fs.readFileSync(filePath)

      // Infer content type if not provided
      if (!contentType) {
        contentType = this.inferContentType(filePath)
      }

      // Create the upload command
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        ACL: acl,
        ...(metadata && { Metadata: metadata }),
      })

      // Upload the file
      const result = await this.s3Client.send(command)

      // Return success response with public URL
      const publicUrl = this.getPublicUrl(key, bucket)

      return {
        success: true,
        result,
        publicUrl,
        key,
        bucket,
        contentType,
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
  }

  /**
   * Upload data (Buffer or string) directly to S3
   * @param {Object} params - Upload parameters
   * @param {Buffer|string} params.data - Data to upload
   * @param {string} params.key - Object key (path) in the bucket
   * @param {string} params.bucket - Bucket name
   * @param {string} params.contentType - MIME type
   * @param {string} [params.acl='public-read'] - Access control list
   * @param {Object} [params.metadata] - Additional metadata to store with the object
   * @returns {Promise<Object>} Upload result with publicUrl
   */
  async uploadData({ data, key, bucket, contentType, acl = 'public-read', metadata = null }) {
    try {
      // Create the upload command
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ACL: acl,
        ...(metadata && { Metadata: metadata }),
      })

      // Upload the data
      const result = await this.s3Client.send(command)

      // Return success response with public URL
      const publicUrl = this.getPublicUrl(key, bucket)

      return {
        success: true,
        result,
        publicUrl,
        key,
        bucket,
        contentType,
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
  }

  /**
   * Generate a presigned URL for client-side uploads
   * @param {Object} params - Parameters for presigned URL generation
   * @param {string} params.key - Object key (path) in the bucket
   * @param {string} params.bucket - Bucket name
   * @param {string} [params.contentType] - MIME type (auto-detected if not provided)
   * @param {number} [params.expiresIn=180] - URL expiration time in seconds
   * @param {string} [params.acl='public-read'] - Access control list
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUploadUrl({
    key,
    bucket,
    contentType = null,
    expiresIn = 180,
    acl = 'public-read',
  }) {
    // Infer content type if not provided
    if (!contentType) {
      contentType = this.inferContentType(key)
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: acl,
    })

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresIn,
      signableHeaders: new Set(['host']),
    })
  }

  /**
   * Delete an object from S3
   * @param {Object} params - Deletion parameters
   * @param {string} params.key - Object key to delete
   * @param {string} params.bucket - Bucket name
   * @returns {Promise<Object>} Deletion result
   */
  async deleteObject({ key, bucket }) {
    try {
      // Create the delete command
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      // Delete the object
      const result = await this.s3Client.send(command)

      return {
        success: true,
        result,
        key,
        bucket,
        message: `Successfully deleted object: ${key} from bucket: ${bucket}`,
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
  }
}

// Test function
const test = async () => {
  try {
    // Try to load secrets for testing
    const secrets = require('../secrets')

    // Create S3 instance
    const s3 = new S3Utils({
      region: secrets.LINODE_BUCKET_REGION,
      accessKeyId: secrets.LINODE_S3_ACCESS_KEY,
      secretAccessKey: secrets.LINODE_S3_SECRET_KEY,
    })

    const filePath = path.join(__dirname, 'test.txt')

    console.log('Testing S3Utils class with object parameters...')
    const result = await s3.uploadFile({
      filePath: filePath,
      key: '/temp/test-file.txt',
      bucket: secrets.LINODE_BUCKET_NAME,
      contentType: 'text/plain',
    })
    console.log('Upload result:', result)

    // Uncomment to test deletion
    // const deleteResult = await s3.deleteObject({
    //   key: '/temp/test-file.txt',
    //   bucket: secrets.LINODE_BUCKET_NAME
    // })
    // console.log('Delete result:', deleteResult)
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  test().catch((err) => {
    console.error('Error:', err)
  })
}

// Export the class as the main export
module.exports = S3Utils

// Also provide named exports for flexibility
module.exports.S3Utils = S3Utils
module.exports.default = S3Utils
