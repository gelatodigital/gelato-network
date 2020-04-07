export default ms => {
  return new Promise(resolve => {
    console.log(`\n\tSleeping for ${ms / 1000} seconds\n`);
    setTimeout(resolve, ms);
  });
};
