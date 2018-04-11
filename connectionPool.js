const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');


class Connection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host || null;
    this.port = options.port || null;
    this.username = options.username || '';
    this.socket = null;
    this.status = 0;
    this.id = uuidv4();
    this.secret = null;
    this.RPCcounter = 1;
    this.job = null;
    this.jobCheck = [];
    
    this.commands = {
      subscribe: {"id": this.RPCcounter, "method": "mining.extranonce.subscribe", "params": []},
      authorize: {"params": [this.username, "password"], "id": this.RPCcounter, "method": "mining.authorize"},
      login: {"method":"login","params":{"login":this.username,"pass":"x","agent":"excavator/1.4.4a_nvidia"},"id":this.id}
    };
    
    this.on('found', this.handleSubmitShare)
  }
  
  handleSubmitShare(job, userId) {
    job.id = userId;  //use workers UUID to track share submission
    job.params.id = this.secret;  //use the connections secret ID to submit
    this.jobCheck[userId] = true; //record which job has been submitted by who
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
      if(message.id === this.id) {
        this.secret = message.result.id;
        console.log('POOL CONNECTED', this.secret);
      }
      
      
      //share was submitted and server just validated
      if(message.id && message.result && message.result.status === 'OK') {
        console.log('SHARE JUST CHECKED', message.id)
        if(this.jobCheck[message.id]) {
          this.emit('shareValidated'+message.id)
          this.jobCheck[message.id] = false;
        }
      }
      
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