const Proxy = require('./proxy');

let proxy = new Proxy({
  listen: 6666,
  poolPort: 5555,
  poolHost: 'localhost',
  username: '46ydR5qAqxhaBonypdGRnF7syctgsLivUTupjxzC9kFTFaNKGrb95ZYA6Gu6KaTV5MfCtuHStuWa1ifCT7JPFUqwPk9eD8s+3000'
})

proxy.listen();
proxy.on("validated", function(user, diff) {
  console.log('Boom. Headshot', user, diff);
})