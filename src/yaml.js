'use strict'

const fs = require('fs-extra')
const yaml = require('yaml')
const yamlTypes = require('yaml/types')

// Returns a promise to read YAML files
module.exports.read = (filePath) => {
  return fs.readFile(filePath, 'utf-8').then(fileBody => {
    let doc = yaml.parse(fileBody, {merge: true})
    if (!doc) {
      console.warn(`YAML-file ${filePath} seems to be empty or invalid`)
      return
    }
    return doc
  })
}

module.exports.readAsDoc = (filePath) => {
  return fs.readFile(filePath, 'utf-8')
    .then(fileBody => {
      let doc = yaml.parseDocument(fileBody, {
        schema: 'core'
      })

      if (doc.errors.length > 0) {
        throw new Error('Document contains errors:\n\t' + doc.errors.join('\n\t'))
      }

      return doc
    })
    .catch(error => {
      if (error.code === 'ENOENT') {
        return
      }

      throw error
    })
}

module.exports.createDoc = (value = {}) => {
  return new yaml.Document(value)
}

module.exports.setAttributeForStage = (stage, attribute, value, doc) => {
  const stageNode = doc.get(stage)

  if (!stageNode) {
    doc.set(stage, doc.createNode({[attribute]: value}))
    return
  }

  stageNode.set(attribute, value)
}

module.exports.isCollection = (collection) => {
  return collection instanceof yamlTypes.Collection
}

module.exports.safeSetCollectionPair = (key, value, collection) => {
  if (module.exports.isCollection(collection)) {
    collection.set(key, value)
  }
}
// Returns a promise to write YAML files
module.exports.write = (filePath, doc) => {
  let fileBody = doc.toString()
  return fs.writeFile(filePath, fileBody)
}
