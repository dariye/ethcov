const yaml = require('js-yaml')
fs = require('fs')

const getEthcovStatus = require('./lib/ethcov.js')

module.exports = app => {
  app.on([
    'pull_request.opened',
    'pull_request.synchronize',
    'check_run.rerequested'
  ],
    check
  )

  async function check (context) {
    const startedAt = new Date()
    let defaultConfig = null

    try {
      defaultConfig = yaml.safeLoad(fs.readFileSync('.github/ethcov.yml', 'utf8'))
    } catch (e) {
      console.log(e)
    }

    const { principles, signature } = defaultConfig

    const config = await context.config('ethcov.yml', {
      signature,
      principles
    })

    const pr = context.payload.pull_request

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }))

    const commits = compare.data.commits

    const ethcovFailed = await getEthcovStatus(commits, config, pr.html_url)

    if (!ethcovFailed.length) {
      context.github.checks.create(context.repo({
        name: 'Ethcov',
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
        status: 'completed',
        conclusion: 'success',
        started_at: startedAt,
        completed_at: new Date(),
        output: {
          title: 'Ethcov',
          summary: 'All commits pass ethical considerations check!'
        }
      }))
        .catch(function checkFails(error) {
          if (error.code === 403) {
            const params = {
              sha: pr.head.sha,
              context: 'Ethcov',
              state: 'success',
              description: 'All commits pass ethical considerations check!',
              target_url: 'https://github.com/pauldariye/ethcov'
            }
            return context.github.repos.createStatus(context.repo(params))
          }
        })
    } else {
      let summary = []
      ethcovFailed.forEach(function (commit) {
        summary.push(`Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${commit.author}, Committer: ${commit.committer}; ${commit.message}`)
      })

      summary = summary.join('\n')

      if (ethcovFailed.length === 1) summary = `${handleOneCommit(pr, ethcovFailed)} \n\n ${summary}`
      else summary = `${handleMultipleCommits(pr, commits.length, ethcovFailed)} \n\n ${summary}`

      context.github.checks.create(context.repo({
        name: 'Ethcov',
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
        status: 'completed',
        started_at: startedAt,
        conclusion: 'action_required',
        completed_at: new Data(),
        output: {
          title: 'Ethcov',
          summary
        },
        actions: [{
          label: 'Add ethical considerations to pass',
          description: 'would set status to passing',
          identifier: 'override'
        }]
      }))
        .catch(function checkFails(error) {
          if (error.code === 403) {
            const description = ethcovFailed[(ethcovFailed.length - 1)].message.substring(0, 140)
            const params = {
              sha: pr.head.sha,
              context: 'Ethcov',
              state: 'failure',
              description,
              target_url: 'https://github.com/pauldariye/ethcov'
            }
            return context.github.repos.createStatus(context.repo(params))
          }
        })
    }
  }
}

function handleOneCommit(pr, ethcovFailed) {
  return `You only have one commit incorrectly signed`
}

function handleMultipleCommits(pr, commitLength, ethcovFailed) {
  return `You only have ${ethcovFailed.length} commits incorrectly signed`
}
