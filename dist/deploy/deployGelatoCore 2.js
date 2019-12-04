"use strict";

var _buidler = _interopRequireDefault(require("@nomiclabs/buidler"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function main() {
  return regeneratorRuntime.async(function main$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(_buidler["default"].run("compile"));

        case 2:
        case "end":
          return _context.stop();
      }
    }
  });
}

main().then(function () {
  return process.exit(0);
})["catch"](function (error) {
  console.error(error);
  process.exit(1);
});