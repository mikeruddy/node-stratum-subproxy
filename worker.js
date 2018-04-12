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
    
    this.nonces = [
      '0A',
      '0B',
      '0C',
      '0D',
      '0E',
      '0F',
      '10',
      '20',
      '30',
      '40',
      '50',
      '60',
      '70',
      '90',
      'A1',
      'AA',
      'AB',
      'AC',
      'AD',
      'AE',
      'AF'
    ];
    
    this.pool.on("shareValidated"+this.id, this.handleShareValidated.bind(this))
    this.pool.on("job", this.handleNewJob.bind(this));
  }
  
  handleShareValidated(isValid) {
    if(isValid === false) {
      console.warn('Need to send user warning message here instead');
    }
    
    console.log(`${this.user} validated a share @ ${this.diff} diff`);
    this.emit('validated', this.user, this.diff);
    this.mockResponse('ok');
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
    this.mockResponse('start');
  }
  
  mockResponse(command) {
    if(command === 'start') {
      if(!this.job) {
        return;
      }
      
      let nonce = this.nonces[this.pool.nextNonce];
      this.job.id = this.id;
      this.job.blob = this.job.blob.replace("00000000", `0000${nonce}${nonce}`);
      console.log('UPDATE MAGIC NONCE', nonce, this.job.blob);
    }
    
    this.RPCcounter += 1;
    
    let messages = {
      start: commands.miner.start(this.id, this.job),
      ok: commands.miner.ok(this.rpcCount)
    }
    
    if(this.connection && this.connection.write) {
      this.connection.write(JSON.stringify(messages[command]) + "\n");
    } else {
      this.kill();
    }
  }
  
  handleNewJob(job) {
    let nonce = this.nonces[this.pool.nextNonce];
    this.job = JSON.parse(JSON.stringify(job));
    this.job.id = this.id;
    this.job.blob = this.job.blob.replace("00000000", `0000${nonce}${nonce}`);
    
    console.log('NEW JOB NEW NONCE', nonce, '-----',  this.job.blob);
    
    let response = {
    	"jsonrpc": "2.0",
    	"method": "job",
    	"params": this.job
    };
    
    this.messageToMiner(response);
  }
  
  messageToMiner(message) {
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
        this.mockResponse('ok');
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

  handleSendToPool() {

  }

  handleDisconnect() {

  }
  
  kill() {
    this.emit('kill', this.id);
    this.removeAllListeners();
  }
}

module.exports = Worker;