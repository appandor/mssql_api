const config = require('../config/database')

const sql = require('mssql')
const conn =  new sql.ConnectionPool(config) 

conn.connect()

// *******************************************************************
// ** database
// *******************************************************************

function ExecuteProc(proc, param, value, callback) {
  const request = new sql.Request(conn) 
  request.input(param, sql.VarChar(30), value)
  request.execute(proc, (err, result) => {
    if (err) {
      callback(500, { message: 'ExecuteProc ' + proc + ' failed.' })
    } else {
      callback(200, result.recordset[0])
    }
  })
}

function QuerySQL(query, callback) {
  const request = new sql.Request(conn)
  request.query(query, (err,result) => {
    if (!err) {
      callback(result, null)
    } else {
      callback(err.message, 500)
    }
  })
}

function GetInsertResult(result, okResult, err, callback) {
  if (err) {
    status   = 500
    response = { message: 'Internal server error' }
  } else {
    if (result.rowsAffected == 0) {
        status   = 404
        response = { message: 'id not found' }
    } else {
        status   = 200
        response = (okResult)
    }
  }
  callback(status,response)
}


function GetSelectResult(result, err, callback) {
  if (err) {
    status   = 500
    response = { message: 'Internal server error' }
  } else {
    if (result.rowsAffected == 0) {
        status   = 404
        response = { message: 'id not found' }
    } else {
        status   = 200
        response = (result.recordset)
    }
  }
  callback(status,response)
}

module.exports.QuerySQL = QuerySQL
module.exports.ExecuteProc = ExecuteProc
module.exports.GetSelectResult = GetSelectResult
module.exports.GetInsertResult = GetInsertResult
