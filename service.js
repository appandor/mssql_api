var Service = require('node-windows').Service

// Create a new service object
var svc = new Service({
  name:         'APPandor - MSSQL REST API',
  description:  'REST API Routes for MSSQL', 
  script:       require('path').join(__dirname,'index.js')
})

svc.workingdirectory = "C:\\MSSQL_API\\"
// Install the service.
svc.install()