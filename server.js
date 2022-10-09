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
getThingAll, 
getIri,
universalAccess } = require('@inrupt/solid-client');
const mqtt = require('mqtt');

const session = new Session();

function generateRandomId() {
    return `mqtt_${Math.random().toString(16).slice(3)}`
}

//authenticate
session.login({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    oidcIssuer: process.env.oidcIssuer,
}).then(async () => {
    // get storage uri
    const webId = session.info.webId;
    const data = await getSolidDataset(webId, {fetch: session.fetch});
    const graph = getThing(data, webId);
    const storageUri = getUrl(graph, 'http://www.w3.org/ns/pim/space#storage');

    // get contact ids dataset
    const sensorContactsUri = `${storageUri}contacts/sensorContacts`;
    let sensorContactsDataset = await getSolidDataset(sensorContactsUri, {fetch: session.fetch});
    const sensorContacts = getThingAll(sensorContactsDataset);
    let sensorContactsCache = sensorContacts.map(thing => getIri(thing, 'https://www.exampe.com/contact#webId'))
    
    //get sensor container resource (SCR)
    const extendedProfileUri = getUrl(graph, 'http://www.w3.org/2000/01/rdf-schema#seeAlso');
    const extendedProfile = await getSolidDataset(extendedProfileUri, { fetch: session.fetch });
    const extendedProfileWebIdThing = getThing(extendedProfile, webId);
    const sensorContainerResource = getStringNoLocale(extendedProfileWebIdThing, 'http://www.example.org/sensor#sensorInbox');
    
    //get subscribedTopics resource
    const subscribedTopicsUri = `${storageUri}public/subscribedTopics`
    const subscribedTopicsDataset = await getSolidDataset(subscribedTopicsUri)
    const subscribedTopicsThings = getThingAll(subscribedTopicsDataset);
    const subscribedTopicsCache = subscribedTopicsThings.map(thing => getStringNoLocale(thing, 'http://www.example.org/identifier#fullTopicString').split('+'))
    //console.log(subscribedTopicsCache);
    
    const sensorContactsSocket = new WebsocketNotification(
        sensorContactsUri,
        { fetch: session.fetch }
    )
    
    sensorContactsSocket.on("error", (error) => {
        console.log(error.message);
    })

    sensorContactsSocket.on("connected", () => {
        console.log('connected sensor contacts socket!')
    })

    sensorContactsSocket.on("closed", () => {
        console.log('closed sensor contacts socket!')
    });

    sensorContactsSocket.on("message", async (notif) => {
        console.log(`sensor contacts socket: ${notif}`);
    })

    sensorContactsSocket.connect();

    const sensorContainerSocket = new WebsocketNotification(
        sensorContainerResource,
        { fetch: session.fetch }
    )
    
    sensorContainerSocket.on("error", (error) => {
        console.log(error.message);
    })

    sensorContainerSocket.on("connected", () => {
        console.log('connected sensor container socket!')
    })

    sensorContainerSocket.on("closed", () => {
        console.log('closed sensor container socket!')
    });

    sensorContainerSocket.on("message", async (notif) => {
        console.log(`sensor container socket: ${notif}`);
    })

    sensorContainerSocket.connect();
    

    const subscribedTopicsSocket = new WebsocketNotification(
        subscribedTopicsUri,
        { fetch: session.fetch }
    )
    
    subscribedTopicsSocket.on("error", (error) => {
        console.log(error.message);
    })

    subscribedTopicsSocket.on("connected", () => {
        console.log('connected subscribed topics socket!')
    })

    subscribedTopicsSocket.on("closed", () => {
        console.log('closed subscribed topics socket!')
    });

    subscribedTopicsSocket.on("message", async (notif) => {
        console.log(`subscribed topics socket: ${notif}`);
    })

    subscribedTopicsSocket.connect();
    

    //establish mqtt client
    const id = generateRandomId();
    const url = 'mqtt://broker.hivemq.com/'
    const client = mqtt.connect(url, {
        id,
        clean: true,
        connectTimeout: 5000,
    })

    //client.subscribe([subscribeTopic], () => {
    //    console.log(`client subscribed to ${subscribeTopic}`)
    //})

    client.on('connect', () => {
        console.log('client connected!')
    })

    client.on('message', (topic, payload, packet) => {
        console.log(`received ${topic} with data: ${payload.toString()}`)
        //have to write to data on certain messages and subscribed topics
    })

    client.on('error', (err) => { 
        console.log(err)
    })
       

    if (sensorContactsIds.length > 0) {
        const ws = new WebsocketNotification(
            sensorContactsUri,
            { fetch: session.fetch}
        )
        ws.on("error", (error) => {
            console.log(error)
        })
        ws.on("closed", () => {
            console.log('contacts websocket closed!')
        })
        ws.on("connected", () => {
            console.log('listening to contacts dataset!')
        })
        ws.on("message", async (notification) => {
            console.log(notification)
            sensorContactsDataset = await getSolidDataset(sensorContactsUri, {fetch: session.fetch});
            let newSensorContacts = getThingAll(sensorContactsDataset);
            let newContactsIds = newSensorContacts.map(thing => getIri(thing, 'https://www.exampe.com/contact#webId'))
            let newWebId = newContactsIds.filter(webId => !sensorContactsIds.includes(webId));
            if (cache.length > 0) {
                for (const cUrl of cache) {
                    try {
                        await universalAccess.setAgentAccess(cUrl, newWebId, { fetch: session.fetch});
                        console.log(`access to ${cUrl} given to ${newWebId}`);
                    } catch (err) {
                        console.log(err);
                    }
                }
            } else {
                console.log('nothing in the cache rn')
            }
            
            sensorContactsIds = newContactsIds;
        })
        ws.connect();
    }
    /** 
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
            //i need to also check to see if the sensor is subscribed to or not
            //can i do that somewhere down here somehow?
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

*/
}).catch((err) => console.log(err));
