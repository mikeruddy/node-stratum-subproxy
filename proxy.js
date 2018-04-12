const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');

const ConnectionPool = require('./connectionPool');
const Worker = require('./worker');


class Proxy extends EventEmitter {
  constructor(options) {
    super();
    this.connectionPool = null;
    this.workers = {};
    this.listenPort = options.listen || 5588;
    this.poolConfig = {
      host: options.poolHost || 'pool.supportxmr.com',
      port: options.poolPort || 3333,
      username: options.username || 'bitcoinAddress'
    }
  }
  
  listen() {
    this.connectToPool();
    this.listenForMiners();
  }
  
  connectToPool() {
    this.connectionPool = new ConnectionPool(this.poolConfig);
    this.connectionPool.connect();
  }
  
  listenForMiners() {
    let server = net.createServer();
    server.on('connection', this.handleConnection.bind(this));
    server.listen(this.listenPort, function() {  
      console.log('server listening to %j', server.address());
    });
  }
  
  handleConnection(connection) {
    let id = uuidv4();
    let worker = new Worker({
      id,
      connection,
      pool: this.connectionPool
    });
    worker.connect();
    worker.on('validated', (user, diff) => {
      this.emit('validated', user, diff);
    })
    worker.on('kill', (userId) => {
      delete this.workers[userId];
    })
    this.workers[id] = worker;
  }
}

module.exports = Proxy;