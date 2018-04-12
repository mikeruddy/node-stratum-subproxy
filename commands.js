module.exports = {
  pool: {
    subscribe: function(rpcCount) {
      return {
      	"id": rpcCount,
      	"method": "mining.extranonce.subscribe",
      	"params": []
      };
    },
    authorize: function(username, rpcCount) {
      return {
      	"params": [username, "password"],
      	"id": rpcCount,
      	"method": "mining.authorize"
      }
    },
    login: function(username, id) {
      return {
      	"method": "login",
      	"jsonrpc": "2.0",
      	"params": {
      		"login": username,
      		"pass": "x",
      		"agent": "hitlist/proxy"
      	},
      	"id": id
      }
    }
  },
  miner: {
    ok: function(rpcCount) {
      return {
      	"id": rpcCount,
      	"jsonrpc": "2.0",
      	"error": null,
      	"result": {
      		"status": "OK"
      	}
      }
    },
    start: function(id, job) {
      return {
      	"id": 1,
      	"jsonrpc": "2.0",
      	"error": null,
      	"result": {
      		"id": id,
      		"job": job,
      		"status": "OK"
      	}
      }
    }
  }
};