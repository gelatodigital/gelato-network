execShellCommandLog = (cmd) => {
  const exec = require("child_process").exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      console.log(stdout)
      resolve(stdout ? stdout : stderr);
    });
  });
}

execShellCommand = (cmd) => {
  const exec = require("child_process").exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      console.log(stdout)
      resolve(stdout ? stdout : stderr);
    });
  });
}

module.exports = {
    execShellCommand,
    execShellCommandLog
}
