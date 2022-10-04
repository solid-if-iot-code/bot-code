const { Session } = require("@inrupt/solid-client-authn-node");
const { WebsocketNotification } = require('@inrupt/solid-client-notifications');
require('dotenv').config();
const { saveSolidDatasetAt, 
  buildThing, 
  saveSolidDatasetInContainer, 
  createContainerInContainer, 
  getSolidDataset, 
  createThing, 
  setThing,
  createSolidDataset } = require('@inrupt/solid-client');
const session = new Session();
session.login({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    oidcIssuer: process.env.oidcIssuer,
}).then(async () => {
    const webId = session.info.webId;
    const data = await getSolidDataset(webId, {fetch: session.fetch});
    console.log(data) 
}).catch((err) => console.log(err));