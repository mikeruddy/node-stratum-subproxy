const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');


class Connection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host || null;
    this.port = options.port || null;
    this.username = options.username || '';
    this.socket = null;
    this.status = 0;
    this.id = null;
    this.RPCcounter = 1;
    this.job = null;
    
    this.commands = {
      subscribe: {"id": this.RPCcounter, "method": "mining.extranonce.subscribe", "params": []},
      authorize: {"params": [this.username, "password"], "id": this.RPCcounter, "method": "mining.authorize"},
      login: {"method":"login","params":{"login":this.username,"pass":"x","agent":"excavator/1.4.4a_nvidia"},"id":this.RPCcounter}
    };
    
    this.on('found', this.handleFound)
  }
  
  handleFound(job) {
    this.sendToPool(job);
  }
  
  connect() {
    this.socket = net.connect(+this.port, this.host);
    
    this.socket.on('data', (data) => {
      this.handlePoolMessage(data);
    });
    
    this.sendToPool(this.commands.login);
  }
  
  sendToPool(message) {
    if(this.socket && this.socket.write) {
      this.socket.write(JSON.stringify(message) + "\n");
    }
  }
  
  subscribe() {
    this.sendToPool(this.commands.subscribe);
  }
  
  handlePoolMessage(data) {
    let message = data;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.warn(`can't parse message as JSON from miner:`, data, e.message);
      return;
    }
    
    if(message.result && message.result.status === 'OK') {
      this.id = message.result.id;
      
      if(message.result.job) {
        this.job = message.result.job;
        this.emit("job", this.job);
      }
      
      return;
    }
    
    
    switch(message.method) {
      case "job": {
        console.log('found new job!')
        this.job = message.params;
        this.emit("job", this.job);
        break;
      }
    }
    
    
    
  }
}


module.exports = Connection









