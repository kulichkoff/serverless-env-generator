'use strict'

const AWS = require('aws-sdk')

let kmsCache = {}

const getKms = module.exports._getKms = (config) => {
  var kms = kmsCache[config.kmsKeyId]
  if (!kms) {
    let credentials = (config.profile)
      ? new AWS.SharedIniFileCredentials({ profile: config.profile })
      : undefined
    kms = kmsCache[config.kmsKeyId] = new AWS.KMS({
      apiVersion: '2014-11-01',
      region: config.region,
      credentials: credentials,
      params: {
        KeyId: config.kmsKeyId
      }
    })
  }
  return kms
}

// Wrapper for kms.encrypt
module.exports.encrypt = (text, config) => {
  if (process.env.SERVERLESS_ENV_GENERATOR_MOCK_KMS === 'true') {
    return Promise.resolve('__encrypted');
  }
  return new Promise((resolve, reject) => {
    getKms(config).encrypt({ Plaintext: String(text) }, (error, data) => {
      if (error) {
        reject(error)
      } else {
        let encryptedText = data.CiphertextBlob.toString('base64')
        resolve(encryptedText)
      }
    })
  })
}

// Wrapper for kms.decrypt
module.exports.decrypt = (encryptedText, config) => {
  if (process.env.SERVERLESS_ENV_GENERATOR_MOCK_KMS === 'true') {
    return Promise.resolve('__decrypted');
  }
  return new Promise((resolve, reject) => {
    let blob = Buffer.from(encryptedText, 'base64')
    getKms(config).decrypt({ CiphertextBlob: blob }, (error, data) => {
      if (error) {
        reject(error)
      } else {
        let text = data.Plaintext.toString('utf-8')
        resolve(text)
      }
    })
  })
}
