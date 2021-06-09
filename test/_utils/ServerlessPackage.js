const path = require('path')
const fs = require('fs')
const unzipper = require('unzipper')
const etl = require('etl')
const util = require('util')

class ServerlessPackage {
  constructor (base) {
    this.base = path.resolve(base, '.serverless');
  }

  async getContentOf(fileName) {
    let out = ''

    await fs.createReadStream(path.resolve(this.base, 'test.zip'))
      .pipe(unzipper.Parse())
      .pipe(etl.map(async entry => {
        if (entry.path === fileName) {
          const content = await entry.buffer();
          out = content.toString()
        }
        else {
          await entry.autodrain();
        }
      }))
      .promise()

    return out;
  }


  async delete() {
    const exists = await fs.promises.stat(this.base)
      .then(() => true)
      .catch(e => {
        if (e.code === 'ENOENT') {
          return false;
        }
        throw e;
      });

    if (!exists) {
      return;
    }

    await fs.promises.rmdir(this.base, {
      recursive: true
    })
  }
}

module.exports = ServerlessPackage
