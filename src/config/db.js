const dbUrl = require('../appSecrets.json')

// this is for locally installed mongodb
//module.exports = {
//   url: "mongodb://0.0.0.0:27017/",
//   database: "local",
//   imgBucket: "image",
// };
const config = {
  url: dbUrl.MONGODB_URI,
  database: "fosyTech",
  imgBucket: "pictures",
};
module.exports = config