const EventEmitter = require('events');
const uuidv4 = require('uuid/v4');

class Worker extends EventEmitter {
  constructor(options) {
    super();
    this.id = uuidv4();
    this.user = '';
    this.diff = options.diff || 0;
    this.agent = '';
    this.connection = options.connection || null;
    this.job = options.job || null;
    this.pool = options.pool || null;
    this.RPCcounter = 1;
    
    this.pool.on("job", this.handleNewJob.bind(this));
    this.pool.on("shareValidated"+this.id, this.handleShareValidated.bind(this))
  }
  
  
  handleShareValidated() {
    this.mockResponse('ok')
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
    this.mockResponse('start')
  }
  
  mockResponse(command) {
    this.job.id = this.id;
    
    let start = {
    	"id": 1,
    	"jsonrpc": "2.0",
    	"error": null,
    	"result": {
    		"id": this.id,
    		"job": this.job,
    		"status": "OK"
    	}
    };
    
    let ok = {"id":this.RPCcounter,"jsonrpc":"2.0","error":null,"result":{"status":"OK"}}
    this.RPCcounter += 1;
    
    var messages = {
      start: start,
      ok: ok
    }
    
    console.log('miner message', messages.start)
    if(this.connection && this.connection.write) {
      this.connection.write(JSON.stringify(messages[command]) + "\n");
    } else {
      console.log('KILLING MINER')
      this.kill();
    }
  }
  
  handleNewJob(job) {
    this.job = job;
    this.job.id = this.id;
    
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
      console.warn(`can't parse message as JSON from miner:`, message, e.message);
      return;
    }
    
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
    let params = foundJob.params;
    params.id = this.pool.id;
    
    let template = {
    	"method": "submit",
    	params,
    	"id": params.id
    };
    
    this.pool.emit('found', foundJob, this.id)
  }

  shareValidated() {

  }

  handleSendToPool() {

  }

  handleDisconnect() {

  }
  
  kill() {
    console.log('called kill', new Error())
  }

}

module.exports = Worker;