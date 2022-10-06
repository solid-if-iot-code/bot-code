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
  createSolidDataset,
getThingAll } = require('@inrupt/solid-client');
const mqtt = require('mqtt');

const session = new Session();

function generateRandomId() {
    return `mqtt_${Math.random().toString(16).slice(3)}`
}

session.login({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    oidcIssuer: process.env.oidcIssuer,
}).then(async () => {
    const webId = session.info.webId;
    const data = await getSolidDataset(webId, {fetch: session.fetch});
    const graph = getThing(data, webId);
    //const storage = getUrl(graph, 'http://www.w3.org/ns/pim/space#storage');
    const extendedProfileUri = getUrl(graph, 'http://www.w3.org/2000/01/rdf-schema#seeAlso');
    const extendedProfile = await getSolidDataset(extendedProfileUri, { fetch: session.fetch });
    const extendedProfileWebIdThing = getThing(extendedProfile, webId);
    const sensorInboxUri = getStringNoLocale(extendedProfileWebIdThing, 'http://www.example.org/sensor#sensorInbox');
    console.log(sensorInboxUri);
    //const fullSensorUri = `${storage}${sensorInboxUri}`;
    //const sensorData = await getSolidDataset(fullSensorUri, { fetch: session.fetch });
    //console.log(sensorData);
    let cache = [];
    let socketListeners = {};
    if (sensorInboxUri) {
        let dataset = await getSolidDataset(sensorInboxUri, { fetch: session.fetch });
        console.log(sensorInboxUri)
        const ws = new WebsocketNotification(
            sensorInboxUri,
            { fetch: session.fetch }
        )
    
        ws.on("error", (error) => {
            console.log(error);
        })
    
        ws.on("connected", () => {
            console.log('connected!')
            cache = getThingAll(dataset);
            cache = cache.map(thing => thing.url)
            console.log(cache);
        })
    
        ws.on("closed", () => {
            console.log('closed!')
        });
    
        ws.on("message", async (notif) => {
            console.log(notif);
            dataset = await getSolidDataset(sensorInboxUri, { fetch: session.fetch})
            let newThings = getThingAll(dataset);
            newThings = newThings.map(thing => thing.url);
            //console.log(cache)
            //console.log(newThings)
            let newThing = newThings.filter(url => !cache.includes(url));
            cache = newThings;
            const newUrl = newThing[0];
            const wss = new WebsocketNotification(
                newUrl,
                { fetch: session.fetch }
            )
        
            wss.on("error", (error) => {
                console.log(error);
            })
        
            wss.on("connected", () => {
                console.log(`connected to ${newUrl}!`)
            })
        
            wss.on("closed", () => {
                console.log('closed!')
            });
        
            wss.on("message", (notif) => {
                console.log(notif);
            })

            wss.connect();
            socketListeners[newUrl] = wss;
            console.log(socketListeners)
        })

        ws.connect();
    }
    /**const id = generateRandomId();
    const url = 'mqtt://broker.hivemq.com/'
    const publishTopic = 'uark/csce5013/test'
    const subscribeTopic = 'uark/csce5013/ahnelson/light'
    const client = mqtt.connect(url, {
        id,
        clean: true,
        connectTimeout: 5000,
    })

    client.subscribe([subscribeTopic], () => {
        console.log(`client subscribed to ${subscribeTopic}`)
    })

    client.on('connect', () => {
        console.log('client connected!')
    })

    client.on('message', (topic, payload, packet) => {
        console.log(`received ${topic} with data: ${payload.toString()}`)
    })

    client.on('error', (err) => { 
        console.log(err)
    })
    const msg = '79'
    client.publish(publishTopic, msg, () => {
        console.log(`published ${msg}`)
    })**/
}).catch((err) => console.log(err));

function createWebsocket(session, url) {
    

    return ws;
}