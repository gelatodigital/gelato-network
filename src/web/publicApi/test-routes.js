const SUCCESS_OBJ_FOR_TEST = {
  name: 'Foo',
  age: 12,
  address: {
    city: 'Baz',
    zip: 12345,
    address: 'Foo baz 1234'
  },
  validated: true
}

// const debug = require('debug')('DEBUG-dx-services:web:api')

function createRoutes (services) {
  const routes = []

  // Text example (handled directly, the handler doesn't return anything)
  routes.push({
    path: '/text',
    get (req, res) {
      res.send('Just texts')
    }
  })
  
  // Custom tea-pot response (handled directly, the handler doesn't return anything)
  routes.push({
    path: '/tea-pot',
    get (req, res) {
      res.status(418).send("I'm a tea pot")
    }
  })
  
  // Two paths. Render JSON (handled directly, the handler doesn't return anything)
  routes.push({
    path: ['/success', '/success2'],
    get (req, res) {
      res.json(SUCCESS_OBJ_FOR_TEST)
    }
  })
  
  // Throw an error
  routes.push({
    path: '/error',
    get (req, res) {
      throw new Error('Caboom!')
    }
  })
  
  // Return a successful promise. Better return the promise directly
  routes.push({
    path: '/promise-success',
    get (req, res) {
      return Promise
        .resolve(SUCCESS_OBJ_FOR_TEST)
        .then(result => {
          res.json(SUCCESS_OBJ_FOR_TEST)
        })
    }
  })
  
  // Return a failing promise
  routes.push({
    path: '/promise-error',
    get (req, res) {
      return Promise
        .reject(new Error('Caboom, but with promises!'))
        .then(result => {
          res.send(SUCCESS_OBJ_FOR_TEST)
        })
    }
  })
  
  // return an object
  routes.push({
    path: '/object',
    get (req, res) {
      return SUCCESS_OBJ_FOR_TEST
    }
  })
  
  // return a promise of an object
  routes.push({
    path: '/promise-object',
    get (req, res) {
      return Promise.resolve(SUCCESS_OBJ_FOR_TEST)
    }
  })
  
  // Example of a full rest service
  routes.push({
    path: '/rest-example',
    get: (req, res) => {
      console.log('GET')
      res.send(SUCCESS_OBJ_FOR_TEST)
    },
    post: (req, res) => {
      console.log('POST')
      res.send(SUCCESS_OBJ_FOR_TEST)
    },
    put: (req, res) => {
      console.log('PUT')
      res.send(SUCCESS_OBJ_FOR_TEST)
    },
    delete: (req, res) => {
      console.log('DELETE')
      res.send(SUCCESS_OBJ_FOR_TEST)
    }
  })

  return routes
}

module.exports = createRoutes
