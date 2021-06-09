/* global describe it beforeEach afterEach */
const chai = require('chai')
const sinon = require('sinon')
const aws = require('aws-sdk')
const cli = require('../_utils/cli')
const EnvFile = require('../_utils/EnvFile')
const ServerlessPackage = require('../_utils/ServerlessPackage')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
chai.use(chaiAsPromised)

const envFile = new EnvFile(__dirname)
const serverlessPackage = new ServerlessPackage(__dirname)
const ENV_FILE_CONTENT = `anchors:\n  &anchors
  baz: __baz
dev:
  <<: *anchors
  foo: __foo
  encrypted: encrypted:__encrypted
`

describe('e2e.plugin', () => {
  let serverless, sandbox

  beforeEach(async () => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(aws, 'KMS').callsFake(_ => {
      return {
        encrypt: (params, callback) => {
          callback(null, { CiphertextBlob: '__encrypted' })
        },
        decrypt: (params, callback) => {
          callback(null, { Plaintext: { toString: () => '__decrypted' } })
        }
      }
    })
    await envFile.write(ENV_FILE_CONTENT)
  })

  afterEach(async () => {
    sandbox.restore()
    await cli.teardown()
    await envFile.delete()
    await serverlessPackage.delete()
  })

  it('should list environment variables', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev']
    })

    const output = await serverless.getOutput()

    expect(output).to.include('Serverless: env.yml:')
    expect(output).to.include('Serverless:   baz: __baz')
    expect(output).to.include('Serverless:   foo: __foo')
    expect(output).to.include('Serverless:   encrypted: ******')
  })

  it('should list environment variables for attribute "foo" and stage "dev"', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--attribute', 'foo']
    })

    const output = await serverless.getOutput()

    expect(output).to.include('Serverless: env.yml:')
    expect(output).to.include('Serverless:   foo: __foo')
  })

  it('should list decrypted environment variables', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--decrypt'],
      env: {
        SERVERLESS_ENV_GENERATOR_MOCK_KMS: 'true'
      }
    })

    const output = await serverless.getOutput()

    expect(output).to.include('Serverless: env.yml:')
    expect(output).to.include('Serverless:   baz: __baz')
    expect(output).to.include('Serverless:   foo: __foo')
    expect(output).to.include('Serverless:   encrypted: __decrypted (encrypted)')
  })

  it('should write an environment variable', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--attribute', 'foo', '--value', 'changed']
    })
    const content = await envFile.read()
    const expected = ENV_FILE_CONTENT.replace('__foo', 'changed')
    expect(content).to.equal(expected)
  })

  it('should write an encrypted environment variable', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--attribute', 'foo', '--value', 'changed', '--encrypt'],
      env: {
        SERVERLESS_ENV_GENERATOR_MOCK_KMS: 'true'
      }
    })
    const content = await envFile.read()
    const expected = ENV_FILE_CONTENT.replace('__foo', 'encrypted:__encrypted')
    expect(content).to.equal(expected)
  })

  it('should not write a variable if no attribute option is set', async () => {
    await expect(cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--value', 'changed']
    })).to.be.rejected
    const content = await envFile.read()
    expect(content).to.equal(ENV_FILE_CONTENT)
  })

  it('should write an environment variable for anchor', async () => {
    serverless = await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--attribute', 'baz', '--value', 'changed', '--anchor', 'anchors']
    })
    const content = await envFile.read()
    const expected = ENV_FILE_CONTENT.replace('__baz', 'changed')
    expect(content).to.equal(expected)
  })

  it('should write an encrypted environment variable for anchor', async () => {
    await cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--attribute', 'baz', '--value', 'changed', '--anchor', 'anchors', '--encrypt'],
      env: {
        SERVERLESS_ENV_GENERATOR_MOCK_KMS: 'true'
      }
    })
    const content = await envFile.read()
    const expected = ENV_FILE_CONTENT.replace('__baz', 'encrypted:__encrypted')
    expect(content).to.equal(expected)
  })

  it('should not write a variable if no attribute option is set for anchor', async () => {
    await expect(cli.run({
      servicePath: __dirname,
      args: ['env', '--stage', 'dev', '--value', 'changed', '--anchor', 'anchors']
    })).to.be.rejected
    const content = await envFile.read()
    expect(content).to.equal(ENV_FILE_CONTENT)
  })

  it('should write and delete .env file on deployment', async () => {
    await cli.run({
      servicePath: __dirname,
      args: ['package', '--stage', 'dev'],
      env: {
        SERVERLESS_ENV_GENERATOR_MOCK_KMS: 'true'
      }
    })
    const envContent = await serverlessPackage.getContentOf('.env')

    let expected = 'baz=__baz\n'
    expected += 'foo=__foo\n'
    expected += 'encrypted=__decrypted'

    expect(envContent).to.equal(expected)
  })
})
