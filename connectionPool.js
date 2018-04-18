const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
let BigNumber = require('bignumber.js');
const commands = require('./commands');

class Connection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host || null;
    this.port = options.port || null;
    this.username = options.username || '';
    this.socket = null;
    this.status = 0;
    this.id = 1;
    this.secret = null;
    this.RPCcounter = 1;
    this.currentJob = null;
    this.jobCheck = [];
    this.nonce = 0;
    
    this.on('found', this.handleSubmitShare.bind(this));
  }
  
  handleSubmitShare(job, userId) {
    job.id = userId;  //use workers UUID to track share submission
    job.params.id = this.secret;  //use the connections secret ID to submit
    this.jobCheck[userId] = true; //record which job has been submitted by who
    this.sendToPool(job);
  }
  
  get nextNonce() {
    this.nonce += 1;
    return this.nonce;
  }
  
  get myJob() {
    return JSON.parse(JSON.stringify(this.currentJob));
  }
  
  connect() {
    this.socket = net.connect(+this.port, this.host);
    this.socket.on('data', this.handlePoolMessage.bind(this));
    this.sendToPool(commands.pool.login(this.username, this.id));
  }
  
  sendToPool(message) {
    if(this.socket && this.socket.write) {
      this.socket.write(JSON.stringify(message) + "\n");
    }
  }
  
  subscribe() {
    this.sendToPool(commands.pool.subscribe(this.rpcCount));
  }
  
  handlePoolMessage(data) {
    let message = data;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.warn(`can't parse message as JSON from miner:`, data, e.message);
      return;
    }
    
    if(message.id === this.id) {
      //Pool just logged in
      this.nonce = 0;
      this.secret = message.result.id;
      this.currentJob = message.result.job;
      this.emit("job", this.myJob);
    }
    
    if(message.id) {
      if(message.error) {
        console.error('Error: Probably duplicate share', message);
        this.sendToPool(commands.pool.login(this.username, this.id));
        this.emit('shareValidated'+message.id, false);
      }
      
      if(message.result && message.result.status === 'OK') {
        this.emit('shareValidated'+message.id)
        this.jobCheck[message.id] = false;
      }
    }
    
    switch(message.method) {
      case "job": {
        this.nonce = 0;
        this.currentJob = message.params;
        this.emit("job", this.myJob);
        break;
      }
      case "keepalived": {
        console.log('KEEP ALIVE DEBUG ME', message.params.id, new Error())
        this.secret = message.params.id;
        break;
      }
    }
    
  }
}


module.exports = Connection