import env from "@nomiclabs/buidler";

async function main() {
  try {
    await env.run("compile");
    

  } catch (error) {
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
