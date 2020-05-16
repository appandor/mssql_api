/*--------------------------------------------------------------------------
  =========
  MSSQL API
  =========
  REST API for MSSQL Database.
   
  Config access to database in ./config/database.js and the listening port below
  or in the environment variable PORT. */

  const port = process.env.PORT || 443

/*  
   
  Supported methods/routes:

    Routes and methods defined in ./routes/dynamic.js

    POST:
    =====
      /table - specify content in body   

      table is the database table to insert in.

    GET:
    ====
      /table(/id) or /view(id) and optional queryparams

      table is the database table to read from.

      Returns { "fields":[ { "name": FIELDNAME },...], "rows": [ {"FIELDNAME": "CONTENT"},...] }

      Sample: http://ams.metronom.com:443/employee

        ==> SQL: SELECT * FROM employee ORDER BY 1 OFFSET 0 ROWS      
      
      Reserved queryparams:
        - limit=number     Limits the rows (SQL: FETCH NEXT number ROWS ONLY)
        - offset=number    Skip number of rows (SQL: OFFSET number ROWS)
        - orderby=string   Column sortorder (SQL: ORDERBY string)
        - out=excel        Return the result as EXCEL download
        - columns=         select columns, default *
        Sample: http://ams.metronom.com:443/employee?limit=5&offset=5&orderby=3,2

          ==> SQL: SELECT * FROM employee ORDER BY 3,2 OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY

        - like=true        To switch from equal to like query (SQL: WHERE queryparam like '%value%' )
  
      None reserved queryparams:

        These are used for restricting the query (SQL: WHERE)

        Sample: http://ams.metronom.com:443/employee?skill=OS Client Competence

          ==> SQL: SELECT * FROM employee WHERE [skill] = 'OS Client Competence' ORDER BY 1 OFFSET 0 ROWS

    PUT:
    =======
      /table/id
      
      Id is id in database table !!!
      Update content is in body 

    DELETE:
    =======
      /table(/id) and optional queryparams for the where statement.

      table is the database table where to remove rows.

      200 - OK
      500 - Internal Server Error

   -------------------------------------------------------------------------- */

  const express    = require('express')
  const app        = express()
  const router     = express.Router()
  const bodyParser = require('body-parser')
  const cors       = require('cors')
  const logger     = require('./modules/log')
  
// *******************************************************************
// ** Middleware
// *******************************************************************

  app.use(cors())
  app.use(express.static('static'))

  // Overwrite powered by EXPRESS
  router.use('/', function(req, res, next) {
    res.setHeader( 'X-Powered-By', 'Application Management Service' );
    next()
  })
  
  // parse application/json
  app.use(bodyParser.json())
// *******************************************************************
// ** Routes 
// *******************************************************************

  /* To check if the API is running */

  app.get('/favicon.ico', (req,res) => {
    res.status(404)
    res.send('no favicon')
  })
  app.get('/ping', (req,res) => {
    console.log('ping')
    res.status(200)
    res.send('pong')
  })

  router.use('/', require('./routes/dynamic'))
  app.use('/', router) //register the router routes

// *******************************************************************
// ** Listener
// *******************************************************************

  app.listen( port, () => {
    console.log('STARTED')
    logger.log(`Listening on Port ${port}`)
  })
