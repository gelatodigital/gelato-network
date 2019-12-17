export default (obj, ...args) => {
  return args.reduce((obj, property) => obj && obj[property], obj);
};
