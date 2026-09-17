const serverless = require("serverless-http");
const { criarApp } = require("../../server");

const app = criarApp();

module.exports.handler = serverless(app);