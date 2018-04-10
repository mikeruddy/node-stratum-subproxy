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
    this.connectionPool.on("job", this.handleNewJob.bind(this))
  }
  
  handleNewJob(job) {
    this.job = job;
    
    if(this.workers) {
      this.workers.forEach(worker => worker.emit("job", job));
    }
  }
  
  listenForMiners() {
    let server = net.createServer();
    server.on('connection', this.handleConnection.bind(this));
    server.listen(this.listenPort, function() {  
      console.log('server listening to %j', server.address());
    });
  }
  
  handleConnection(connection) {
    let worker = new Worker({
      connection,
      pool: this.connectionPool,
      job: this.job
    });
    worker.connect();
    this.workers.push(worker);
  }
}

module.exports = Proxy;