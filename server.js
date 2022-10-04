const { Session } = require("@inrupt/solid-client-authn-node");
const { WebsocketNotification } = require('@inrupt/solid-client-notifications');
require('dotenv').config();
const { 
  saveSolidDatasetAt, 
  buildThing, 
  saveSolidDatasetInContainer, 
  createContainerInContainer, 
  getSolidDataset, 
  createThing,
  getThing,
  setThing,
  getUrl,
  getStringNoLocale,
  createSolidDataset } = require('@inrupt/solid-client');
const session = new Session();
session.login({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    oidcIssuer: process.env.oidcIssuer,
}).then(async () => {
    const webId = session.info.webId;
    const data = await getSolidDataset(webId, {fetch: session.fetch});
    const graph = getThing(data, webId)
    const storage = getUrl(graph, 'http://www.w3.org/ns/pim/space#storage');
    const extendedProfileUri = getUrl(graph, 'http://www.w3.org/2000/01/rdf-schema#seeAlso');
    //console.log(storage);
    //console.log(extendedProfileUri);
    const extendedProfile = await getSolidDataset(extendedProfileUri, { fetch: session.fetch });
    //console.log(extendedProfile);
    const extendedProfileWebIdThing = getThing(extendedProfile, webId);
    // console.log(extendedProfileWebIdThing)
    const sensorInboxUri = getStringNoLocale(extendedProfileWebIdThing, 'http://www.example.org/sensor#sensorInbox')
    //console.log(sensorInboxUri);
    const fullSensorUri = `${storage}${sensorInboxUri}`;
    //const sensorData = await getSolidDataset(fullSensorUri, { fetch: session.fetch });
    //console.log(sensorData);
    if (fullSensorUri) {
        const ws = new WebsocketNotification(
            fullSensorUri,
            { fetch: session.fetch }
        )
    
        ws.on("error", (error) => {
            console.log(error);
        })
    
        ws.on("connected", () => {
            console.log('connected!')
        })
    
        ws.on("closed", () => {
            console.log('closed!')
        });
    
        ws.on("message", (notif) => {
            console.log(notif);
        })
    }
    
}).catch((err) => console.log(err));