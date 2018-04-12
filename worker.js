const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');
const commands = require('./commands');

class Worker extends EventEmitter {
  constructor(options) {
    super();
    this.id = options.id || uuidv4();
    this.user = '';
    this.diff = options.diff || 5000;
    this.agent = '';
    this.connection = options.connection || null;
    this.job = options.pool.myJob || null;
    this.pool = options.pool || null;
    this.RPCcounter = 1;
    this.pool.on("shareValidated"+this.id, this.handleShareValidated.bind(this))
    this.pool.on("job", this.handleNewJob.bind(this));
  }
  
  handleShareValidated(isValid) {
    if(isValid === false) {
      console.warn('Need to send user warning message here instead');
      this.handleNewJob();
    }
    
    this.emit('validated', this.user, this.diff);
    this.messageToMiner(commands.miner.ok(this.RPCcounter));
  }

  connect() {
    this.buffer = '';
    this.connection.setKeepAlive(true);
    this.connection.setEncoding("utf8");
    this.connection.on("error", error => {
      this.kill();
    });
    this.connection.on("close", () => {
      this.kill();
    });
    
    this.connection.on("data", chunk => {
      this.buffer += chunk;
      while (this.buffer.includes("\n")) {
        const newLineIndex = this.buffer.indexOf("\n");
        const stratumMessage = this.buffer.slice(0, newLineIndex);
        this.buffer = this.buffer.slice(newLineIndex + 1);
        this.handleMessageFromMiner(stratumMessage);
      }
    });
  }

  handleLogin(data) {
    this.user = data.params.login;
    if(this.job) {
      let startCommand = commands.miner.start(this.id, this.uniqueJob);
      this.messageToMiner(startCommand);
    }
  }
  
  get uniqueJob() {
    let nonce_range = 1000;
    let nonce = (this.pool.nextNonce * nonce_range).toString(16);
    let replaceMe = '00000000';
    let newJob = replaceMe.slice(0, (replaceMe.length - nonce.length)) + nonce;
    
    this.job.id = this.id;
    this.job.blob = this.job.blob.replace(replaceMe, newJob);
    
    console.log(`Nonce is ${nonce}`, newJob);
    return this.job;
  }
  
  handleNewJob(job) {
    if(job) {
      this.job = JSON.parse(JSON.stringify(job));
    }
    this.messageToMiner(commands.miner.newJob(this.uniqueJob));
  }
  
  messageToMiner(message) {
    this.RPCcounter += 1;
    
    if(this.connection && this.connection.write) {
      this.connection.write(JSON.stringify(message) + "\n");
    } else {
      this.kill();
    }
  }

  handleMessageFromMiner(message) {
    let data = message;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.warn(`can't parse message as JSON from miner ${this.user}:`, message, e.message);
      this.kill();
      return;
    }
    
    //not all clients update the rpc count. adjust accordingly
    if(data.id) {
      this.RPCcounter = data.id;
    }
      
    switch(data.method) {
      case "login": {
        this.handleLogin(data);
        break;
      }
      case "submit": {
        this.handleSubmit(data);
        break;
      }
      case "keepalived": {
        this.messageToMiner(commands.miner.ok(this.RPCcounter));
        break;
      }
    }
  }

  handleSubmit(foundJob) {
    if(!this.shareValidated(foundJob)) {
      //@TODO handle service abuse and IP banning
      return;
    }
    
    let params = foundJob.params;
    params.id = this.pool.id;
    
    let template = {
    	"method": "submit",
    	params,
    	"id": params.id
    };
    
    this.pool.emit('found', template, this.id);
  }
  
  //@TODO validate shares before submitting
  shareValidated() {
    return true;
  }
  
  kill() {
    console.log(`killing connection for ${this.user}`)
    this.emit('kill', this.id);
    this.removeAllListeners();
  }
}

module.exports = Worker;