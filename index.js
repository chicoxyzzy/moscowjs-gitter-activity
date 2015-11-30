const { GITTER_WEBHOOK, GITHUB_SECRET, PORT = 5000 } = process.env;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const githubMiddleware = require('github-webhook-middleware')({
  secret: GITHUB_SECRET,
});
const fetch = require('node-fetch');
const { FILES_REGEXP, REPO, createGitterActivity } = require('./config');

function getChangedFiles(commits, matchRegex) {
  return commits
    .reduce((previousCommit, { modified, added, removed }) => {
      return previousCommit
        .concat(modified)
        .concat(added)
        .filter(value => !removed.includes(value));
    }, [])
    .filter((value, i, arr) => arr.indexOf(value) >= i && matchRegex.test(value));
}

function createGetFileContentFunction(ref) {
  return filename => {
    return fetch(`https://api.github.com/repos/${REPO}/contents/${filename}?ref=${ref}`)
      .then(res => res.json())
      .then(({ content, encoding }) => ({ filename, content: new Buffer(content, encoding).toString() }));
  };
}

function sendMessage(message) {
  return fetch(GITTER_WEBHOOK, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
}

function sendGitterActivity(activity) {
  if (Array.isArray(activity)) {
    return Promise.all(activity.map(message => sendMessage(activity)));
  }
  return sendMessage(activity);
}

app.use(githubMiddleware);
app.use(bodyParser.json());

app.post('/', ({ headers, body }, res) => {
  if (headers['x-github-event'] !== 'push') return res.status(200).end();
  const { id: ref } = body.head_commit;
  const getFileContent = createGetFileContentFunction(ref);
  const files = getChangedFiles(body.commits, FILES_REGEXP).map(getFileContent);
  Promise.all(files)
    .then(createGitterActivity)
    .then(sendGitterActivity);
  return res.status(200).end();
});

app.listen(PORT, () => {
  console.log('Node app is running on port', PORT);
});
