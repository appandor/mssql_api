const express = require('express')
const router  = express.Router()
const Excel   = require('exceljs')

const db      = require('../modules/database')
const logger  = require('../modules/log')

// *******************************************************************
// ** POST
// *******************************************************************

router.route('/:route').post((req,res) => {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  logger.log ("ROUTER POST REQ:", ip, 'EP:', req.headers.host + req.url)  
  if (req.params.id) { req.query["id"] = req.params.id }

  /* generate UUID */ 
  db.QuerySQL('SELECT NEWID() _uuid', (dbResponse,err) => {
    if (err) {
      logger.log ("ROUTER POST RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 500, 'ERROR:', err)
      res.status(500)
      res.send(err)
    } else {
      //console.log('OK:', dbResponse.recordset[0]._uuid)
      //console.log('BODY:', req.body)
      const respond = {}
      respond.result = 'Legt ein Datensatz in der Tabelle '+req.params.route+' an.'
      respond.data = {}
      respond.data._uuid = dbResponse.recordset[0]._uuid
      var uuid = respond.data._uuid
      /* Parse body parameter to columns for insert */
      var insertSQL = "INSERT INTO "+req.params.route+" "
      var sqlKeys   = "("
      var sqlValues = "VALUES("
      for(var key in req.body){ 
        sqlKeys   += "["+key+"]," 
        sqlValues += "'" + req.body[key]+"'," 
        respond.data[key] = req.body[key]
      }
      insertSQL += sqlKeys+"_uuid) "+sqlValues+"'"+uuid+"')" 
      respond.sql = insertSQL
      //console.log(respond.sql)
      db.QuerySQL(respond.sql, (dbResponse,err) => {
        if (err) {
          logger.log ("ROUTER POST RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 500, 'ERROR:', err)
          res.status(500)
          res.send(err)
        } else {
          respond.result = dbResponse
          logger.log ("ROUTER POST RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 200)
          res.status(200)
          respond.location = req.url+uuid
          res.send (respond) 
          //console.log(req.url)
        }
      })      
    }
  })  
})

// *******************************************************************
// ** GET
// *******************************************************************

router.route('/:route/:uuid?').get((req,res) => {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  logger.log ("ROUTER GET REQ:", ip, 'EP:', req.headers.host + req.url)  
  if (req.params.uuid) { req.query["_uuid"] = req.params.uuid }

  var params = {
    route:  req.params.route.toLowerCase(), 
    _uuid:  req.query.uuid,
    query:  req.query
  }
  const respond = {}
  const query = "select COLUMN_NAME name from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = '"+params.route+"'"
  //console.log("QUERY", query)
  db.QuerySQL(query, (result, err) => {
    db.GetSelectResult(result, err, (status, result) => {
      respond.fields = result

      // *******************************************************************
      // Inspect query params                       
      // *******************************************************************

      let whereand = ""
      let like     = false
      let offset   = 0
      let sortorder = 1 
      let limit    = ""
      let columns  = "*"

      var respondMode = 'json'  /* default respond mode */

      for (var queryParam in params.query) {
        switch (queryParam) {
          case "columns":
            columns =  params.query.columns
            delete req.params.columns
            break
          case "out":
            respondMode =  params.query.out
            delete req.params.out
            break
          case "like":
            like = params.query.like == "true" ? true : false 
            delete params.query.like    
            break
          case "offset":
            offset = params.query.offset 
            delete params.query.offset
            break
          case "orderby":
            //console.log ("queryparam:", queryParam, "=",params.query[queryParam])
            sortorder = params.query[queryParam]
            break
          case "limit":
            limit = " FETCH NEXT " + params.query.limit +  " ROWS ONLY" 
            delete params.query.limit    
            break
          default:
            // *******************************************************************
            // QueryParam ARRAY => ... param IN ['a','b','c']
            // *******************************************************************
            //console.log("TEST:", queryParam, Array.isArray(params.query[queryParam]) )
            //console.log ("queryparam:", queryParam, "=",params.query[queryParam])
            if (Array.isArray(params.query[queryParam])) {
              var inParam = "("
              for (var param of params.query[queryParam]) {
                inParam += "'" + param + "',"
              }  
              inParam = inParam.slice(0, -1) + ')'     /* Replace last character */
              console.log ("inparam:", inParam)
              whereand += " AND [" + queryParam + "] IN " + inParam
            } else {
              if (like) {
                whereand += " AND [" + queryParam + "] LIKE '%" + params.query[queryParam] + "%'"
              } else {
                whereand += " AND [" + queryParam + "] = '" + params.query[queryParam] + "'"
              }
            }
          /* end case */              
       }
      }
      if (whereand != "" ) { whereand = whereand.replace("AND","WHERE") }
      const query = "SELECT "+columns+" FROM " + params.route + whereand + " ORDER BY " + sortorder + " OFFSET "+ offset + " ROWS" + limit
      //console.log("QUERY", query)
      db.QuerySQL(query, (result, err) => {
        db.GetSelectResult(result, err, (status, result) => {
          respond.rows = result
          if (respondMode == 'json') {
            logger.log ("ROUTER GET RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', status)
            res.status(status)
            res.send (respond) 
          } else if (respondMode == 'rows') {
            logger.log ("ROUTER GET RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', status)
            res.status(status)
            res.send (result) 
          } else if (respondMode == 'excel') {
            // *******************************************************************
            // Respond with EXCEL
            // *******************************************************************
            res.writeHead(200, {
              'Content-Disposition': 'attachment; filename="amsel_'+params.route+'.xlsx"',
              'Transfer-Encoding': 'chunked',
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'           
            })
            var data =[]
            if (Array.isArray(respond.rows)) {
              data = respond.rows 
            } else {
              data.push(respond.rows)
            }  
            var workbook = new Excel.stream.xlsx.WorkbookWriter({ stream: res })
            var worksheet = workbook.addWorksheet(params.route)

            var columns = []
            for(var key in data[0]){
              columns.push({ "header": key, "key": key })
          /*    console.log(key) */
            }
            worksheet.columns = columns

            for(var i=0;i<data.length;i++){
              var row = []
              for(var key in data[i]){
          /*      console.log(data[i][key]) */
                row.push(data[i][key])
              }
              worksheet.addRow(row)
            }
            worksheet.commit()
            workbook.commit()
            /* respond = convert.toExcel(respond.data) */
          } else {
            logger.log ("ROUTER GET RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 404)
            res.status(404)
            res.send({ msg: "Unsupported out mode"})      
          }
        }) 
      }) 
    }) 
  }) 
})

// *******************************************************************
// ** PUT
// *******************************************************************
router.route('/:route/:uuid?').put((req,res) => {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  logger.log ("ROUTER PUT REQ:", ip, 'EP:', req.headers.host + req.url)  
  const respond = {}
  respond.result = 'Update eines Datensatzes in der Tabelle '+req.params.route+'.'

  /* Parse body parameter to columns for update */
  var updateSQL = "UPDATE "+req.params.route+" SET "
  var sqlKeyValues = ""
  for(var key in req.body){ 
    sqlKeyValues += "["+key+"]='"+req.body[key]+"',"
  }
  var where = ''
  if(req.params.uuid) {
    where = "_uuid = '"+req.params.uuid+"'"
  } else {
    //console.log('query:',req.query)
    for (var queryParam in req.query) {
      //console.log('queryparam:',queryParam)
      where+= queryParam+"='"+req.query[queryParam]+"' AND "
    }
    where = where.slice(0, -5)
  }
  // wenn kein queryparam angegeben kommt fehler weil where leer ist. hier noch ein if einbauen
  updateSQL += sqlKeyValues.slice(0, -1) + " WHERE "+where
  respond.sql = updateSQL
  //console.log(respond.sql)
  db.QuerySQL(respond.sql, (dbResponse,err) => {
    if (err) {
      logger.log ("ROUTER PUT RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 500, 'ERROR:', err)
      res.status(500)
      res.send(err)
    } else {
      respond.result = dbResponse
      logger.log ("ROUTER PUT RES:", ip, 'EP:', req.headers.host + req.url, 'Status:', 200)
      res.status(200)
      respond.location = req.url
      res.send (respond) 
      //console.log(req.url)
    }
  })      
})

// *******************************************************************
// ** DELETE
// *******************************************************************

router.route('/:route/:id?').delete((req,res) => {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  logger.log ("ROUTER DELETE REQ:", ip, 'EP:', req.headers.host + req.url)  
  if (req.params.id) { req.query["id"] = req.params.id }

  const respond = {}

  var where = ""
  if (Object.keys(req.query).length > 0) {
    where = " WHERE "
    for(var key in req.query){
      //console.log(key,req.query[key])
      where += key+"='"+req.query[key]+"' AND "
    }
    where = where.slice(0, -5)
  }       
  respond.sql = "DELETE FROM "+req.params.route+where 
  //console.log('SQL:',respond.sql)
  db.QuerySQL(respond.sql, (dbResponse,err) => {
    if (err) {
      res.status(500)
      res.send(err)
    } else {
      respond.dbResponse = dbResponse
      res.send(respond)
    }
  })  
})

module.exports = router
