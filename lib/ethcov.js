const validator = require('email-validator')

module.exports = async function (commits, { signature, principles }, prUrl) {
  const regex = new RegExp(`^${signature}: (.*) <(.*)>$`, 'im')

  let failed = []

  for (const { commit, author, parents, sha } of commits) {
    const isMerge = parents && parents.length > 1
    if (isMerge) {
      continue
    } else if (author && author.type === 'Bot') {
      continue
    }

    const match = regex.exec(commit.message)

    const commitInfo = {
      sha,
      url: `${prUrl}/commits/${sha}`,
      author: commit.author.name,
      committer: commit.committer.name,
      message: ''
    }

    if (match === null) {
      if (!commit.verification.verified) {
        commitInfo['message'] = `Commit by organization member is not verified.`
        failed.push(commitInfo)
      }
    } else {
      if (!(validator.validate(commit.author.email || commit.committer.email))) {
        commitInfo['message'] = `${commit.author.email} is not a valid email address.`
        failed.push(commitInfo)
      }

      const authors = [commit.author.name.toLowerCase(), commit.committer.name.toLowerCase()]
      const emails = [commit.author.email.toLowerCase(), commit.committer.email.toLowerCase()]
      if (!(authors.includes(match[1].toLowerCase())) || !(emails.includes(match[2].toLowerCase()))) {
        commitInfo['message'] = `Expected "${commit.author.name} <${commit.author.email}>", but got "${match[1]} <${match[2]}>".`
        failed.push(commitInfo)
      }

      const { header, terms } = principles

      const headerRegex = new RegExp(`^${header}:`, 'im')

      if (headerRegex.exec(commit.message) === null) {
        console.log('kauna')
        commitInfo['message'] = `Commit missing ethcov sign-off header: "${header}"`
        failed.push(commitInfo)
      }

      terms.forEach((term, idx) => {
        const regex = new RegExp(`^(- \[x\]) (${term})$`, 'im')
        const match = regex.exec(commit.message)

        if (match === null) {
          commitInfo['message'] = `Commit missing missing term ${idx+1}: "${term}"`
          failed.push(commitInfo)
        }
      })

    }
  }
  return failed
}
