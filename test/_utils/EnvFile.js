const path = require('path')
const fs = require('fs').promises

class EnvFile {
  constructor (base) {
    this.base = base;
  }

  async backup() {
    const content = await this.read();
    this.backupContent = content;
  }

  async restoreBackup() {
    if (this.backupContent) {
      await this.write(this.backupContent);
      this.backupContent = '';
    }
  }

  async read() {
    try {
      return (await fs.readFile(this.getPath())).toString();
    } catch (e) {
      return '';
    }
  }

  write(content) {
    return fs.writeFile(this.getPath(), content);
  }

  async delete() {
    await fs.unlink(this.getPath())
  }

  getPath() {
    return path.resolve(this.base, 'env.yml')
  }
}

module.exports = EnvFile
