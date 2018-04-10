const EventEmitter = require('events');


class Worker extends EventEmitter {
  constructor(options) {
    super();
    this.user = '';
    this.diff = options.diff || 0;
    this.agent = '';
    this.connection = options.connection || null;
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
    
    console.log('connecting worker :)')
  }

  handleLogin(data) {
    let params = data.params;
    this.user = params.login;
    
    this.mockResponse('start');
  }
  
  
  //01018c9bafd6055a44d252caaac864df4c978fdc76e4635bd844ab6c5843dd5df080de5f1add70000000086ca138a39f7b7b43c9797793b449d7fc9e62319a5a023c7c11e766e0520d23d301
  
  mockResponse(command) {
    var messages = {
      start: {"jsonrpc":"2.0","id":1,"error":null,"result":{"id":"860546293256357","status":"OK","job":{"job_id":"1","blob":"01018c9bafd6055a44d252caaac864df4c978fdc76e4635bd844ab6c5843dd5df080de5f1add70000000086ca138a39f7b7b43c9797793b449d7fc9e62319a5a023c7c11e766e0520d23d301","target":"e2530000"}}}
    }
    
    if(this.connection && this.connection.write) {
      console.log('TO MINER', command)
      this.connection.write(JSON.stringify(messages[command]) + "\n");
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
    
    console.log('new message', data)
    
    switch(data.method) {
      case "login": {
        this.handleLogin(data);
      }
    }
    
    
    this.emit("test");
  }

  handleJobFound() {

  }

  validateJob() {

  }

  handleSendToPool() {

  }

  handleDisconnect() {

  }
  
  kill() {
    console.log('called kill')
  }

}

module.exports = Worker;