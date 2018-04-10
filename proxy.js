const ConnectionPool = require('./connectionPool');
const Worker = require('./worker');

const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');


class Proxy extends EventEmitter {
  constructor(options) {
    super();
    this.connectionPool = null;
    this.workers = [];
    this.job = null;
  }
  
  start() {
    this.connectToPool();
    this.listenForMiners();
  }
  
  connectToPool() {
    this.connectionPool = new ConnectionPool({
      host: 'localhost',
      port: 9988,
      username: 'bitcoinaddress'
    });

    this.connectionPool.connect();
  }
  
  
  listenForMiners() {
    let server = net.createServer();
    server.on('connection', this.handleConnection);
    server.listen(5588, function() {  
      console.log('server listening to %j', server.address());
    });
  }
  
  handleConnection(connection) {
    let worker = new Worker({
      connection
    });
    worker.connect();
    //@TODO listen on worker events and emit to parent
    
  }
}

module.exports = Proxy;