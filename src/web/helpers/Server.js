const info = require('debug')('INFO-dx-service:Server')
info.log = console.info.bind(console)

const express = require('express')
const http = require('http')
const cors = require('cors')
const { requestErrorHandler } = require('./requestErrorHandler')

// Constants
const DEFAULT_PORT = 8080
const DEFAULT_HOST = '0.0.0.0'
const CONTEXT_PATH = ''

class Server {
  constructor ({
    port = DEFAULT_PORT,
    host = DEFAULT_HOST
  }) {
    this._port = port
    this._host = host
    this._poweredByHeader = null
  }

  async start () {
    // Get the powered by header
    if (this._getServiceName) {
      this._poweredByHeader = await this._getServiceName()
    } else {
      throw new Error('Instances of Server must implement _getServiceName method')
    }

    // App
    const app = express()
    this._app = app

    // Enable CORS
    app.use(cors())

    // Custom middleware
    app.use((req, res, next) => {
      // Remove default X-Powered-By
      res.setHeader('X-Powered-By', this._poweredByHeader)
      next()
    })

    // Register all routes
    if (this._registerRoutes) {
      await this._registerRoutes({
        app,
        contextPath: CONTEXT_PATH
      })
    } else {
      throw new Error('Instances of Server must implement _registerRoutes method')
    }

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
      const err = new Error('Not Found')
      err.status = 404
      err.type = 'NOT_FOUND'
      next(err)
    })

    // error handler
    app.use(function (err, req, res, next) {
      if (res.headersSent) {
        return next(err)
      } else {
        // Add async support
        requestErrorHandler(err, req, res)
      }
    })

    // Version, About (getAboutInfo)
    this._server = http.createServer(app)
    return new Promise((resolve, reject) => {
      this._server.listen(this._port, this._host, () => {
        info(`Running Server on http://%s:%d`, this._host, this._port)
        info(`Try http://%s:%d/api/about to check the service is onLine`,
          this._host, this._port
        )
        resolve(this)
      })
    })
  }

  async stop () {
    if (this._server) {
      info('Stopping server on http://%s:%d ...', this._host, this._port)
      await this._server.close()
    }

    info('The server has been stopped')
  }
}

module.exports = Server
