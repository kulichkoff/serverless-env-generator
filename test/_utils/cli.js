const { node } = require('execa')
const { resolve } = require('path')

let serverlessProcess

const serverlessPath = resolve(
  __dirname,
  `../../node_modules/serverless/bin/serverless.js`,
)

module.exports.printVersion = async function printVersion() {

  serverlessProcess = node(serverlessPath, ['--version'])

  const {stdout} = await serverlessProcess
  console.info(`Serverless version:\n ${stdout}`)
}

module.exports.run = async function setup(options) {
  const { args = [], servicePath, ...forkOptions } = options

  serverlessProcess = node(serverlessPath, args, {
    ...forkOptions,
    cwd: servicePath,
  })

  await serverlessProcess

  return {
    process: serverlessProcess,
    getOutput: async () => {
      // now serverless puts logs to stderr
      const {stderr} = await serverlessProcess
      return stderr
    }
  }
}

module.exports.teardown = async function teardown() {
  if (serverlessProcess.exitCode !== null) {
    return
  }

  serverlessProcess.cancel()

  await serverlessProcess
}
