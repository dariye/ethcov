const nock = require('nock')
const ethcov = require('..')
const myProbotApp = require('..')
const { Probot } = require('probot')
const payload = require('./fixtures/pull_request.opened')
const payloadSuccess = require('./fixtures/pull_request.opened-success')
const checkSuitePayload = require('./fixtures/check_suite.requested')
const checkRunSuccess = require('./fixtures/check_run.created')

nock.disableNetConnect()

describe('Ethcov', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  test('create a failing check', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/roboverse/test/contexts/.github/ethcov.yml')
      .reply(404)

    // nock('https://api.github.com')
    //   .get('/repos/roboverse/test/compare/23kl23kkldfldfklsdksl12kl23...12kl2312923m23902323m2,3i230ddlsjdai23')
    //   .reply('200', compare)

    nock('https://api.github.com') .post('/repos/roboverse/test/check-runs', (body) => {
        body.completed_at = '2018-10-05T17:35:53.683Z'
      })
  })

  test('creates a passing check', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/check-runs', (body) => {
        body.completed_at = '2018-10-05T17:35:53.683Z'
        expect(body).toMatchObject(checkRunSuccess)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload: checkSuitePayload })
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about testing with Nock see:
// https://github.com/nock/nock
