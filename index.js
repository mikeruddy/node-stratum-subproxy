const Proxy = require('./proxy');

let proxy = new Proxy({
  listen: 5588,
  poolPort: 5555,
  poolHost: 'localhost',
  username: '46ydR5qAqxhaBonypdGRnF7syctgsLivUTupjxzC9kFTFaNKGrb95ZYA6Gu6KaTV5MfCtuHStuWa1ifCT7JPFUqwPk9eD8s+5000'
})
proxy.listen();