function requestHandlerWrapper (fn) {
  return (req, res, next) => {
    const result = fn(req, res, next)

    if (result !== undefined) {
      if (result instanceof Promise) {
        return result
          .then(resolvedResult => {
            res.json(resolvedResult)
          })
          .catch(next)
      } else {
        return result
      }
    }
  }
}

module.exports = requestHandlerWrapper
