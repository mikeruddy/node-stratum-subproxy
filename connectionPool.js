const net = require('net');
const buffer = require('buffer');
const EventEmitter = require('events');


class Connection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host || null;
    this.port = options.port || null;
    this.socket = null;
  }
  
  connect() {
    
    this.socket = net.connect(+this.port, this.host);
    this.socket.on('connection', function(con) {
      console.log('connected!');
      this.buffer = '';
      socket.on("data", chunk => {
        this.buffer += chunk;
        while (this.buffer.includes("\n")) {
          const newLineIndex = this.buffer.indexOf("\n");
          const stratumMessage = this.buffer.slice(0, newLineIndex);
          this.buffer = this.buffer.slice(newLineIndex + 1);
          console.log(stratumMessage)
        }
      });
      
      
      this.socket.listen(this.port, function(server) {  
        console.log('server listening to %j', server.address());
      });
      
      console.log('server listening');
      
      
      // this.socket.write(JSON.stringify(message) + "\n");
      this.socket.setKeepAlive(true);
      this.socket.setEncoding("utf8");
      
      
      
    });
    
    
    
    
  }
  
  
}


module.exports = Connection