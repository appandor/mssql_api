const fs = require('fs');
const logfile = "/var/log/rest_api.log"
const logJson = "/var/log/rest_api_json.log"
const date = require('date-and-time')

function Log() {
  let logDate = date.format(new Date(), 'YYYY/MM/DD HH:mm:ss:SS')
  let msg = ""
  for (i = 0;i < arguments.length ; i++){
    msg += " " + arguments[i]  
  }

  //console.log(logDate,"=>", msg)
  fs.appendFile(logfile,logDate + " =>" + msg + '\r\n', (err) => {})
/*
  msgJson = { datetime: logDate, message: msg }
  fs.appendFile(logJson,JSON.stringify(msgJson) + ',\r\n', (err) => {})
*/  
} 
module.exports.log = Log
