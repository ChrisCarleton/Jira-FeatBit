import Resolver from "@forge/resolver";

const resolver = new Resolver();

resolver.define("run", async (req) => {
  console.log("Request:", req);

  return {
    title: "FeatBit for Jira",
    message: "Welcome to FeatBit integration!",
  };
});

export const handler = resolver.getDefinitions();
