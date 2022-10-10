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
universalAccess, 
getContainedResourceUrlAll} = require('@inrupt/solid-client');
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
    let sensorContactsCache = sensorContacts.map(thing => getIri(thing, 'https://www.example.com/contact#webId'))
    
    //get sensor container resource (SCR)
    const extendedProfileUri = getUrl(graph, 'http://www.w3.org/2000/01/rdf-schema#seeAlso');
    const extendedProfile = await getSolidDataset(extendedProfileUri, { fetch: session.fetch });
    const extendedProfileWebIdThing = getThing(extendedProfile, webId);
    const sensorContainerResourceUri = getStringNoLocale(extendedProfileWebIdThing, 'http://www.example.org/sensor#sensorInbox');
    // then get all the sensor resources
    let sensorContainerResourceDataset = await getSolidDataset(sensorContainerResourceUri, { fetch: session.fetch });
    let containedSensorResourceUris = getContainedResourceUrlAll(sensorContainerResourceDataset)
    // do i even need this?
    let allSensorResourcesCache = [];
    for (const cSRU of containedSensorResourceUris) {
        let dataset = await getSolidDataset(cSRU, { fetch: session.fetch })
        let sensorThings = getThingAll(dataset)
        allSensorResourcesCache.push(...sensorThings);
    }

    // get subscribedTopics resource
    const subscribedTopicsUri = `${storageUri}public/subscribedTopics`
    const subscribedTopicsDataset = await getSolidDataset(subscribedTopicsUri)
    const subscribedTopicsThings = getThingAll(subscribedTopicsDataset);
    const subscribedTopicsCache = subscribedTopicsThings.map(thing => getStringNoLocale(thing, 'http://www.example.org/identifier#fullTopicString').split('+'))
    // console.log(subscribedTopicsCache);
    // keep track of all the broker uris initiated for each Mqtt Client
    let mqttClientCache = []
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
        // get a new cache from the resource
        let newSensorContactsDataset = await getSolidDataset(sensorContactsUri, { fetch: session.fetch})
        let newSensorContacts = getThingAll(newSensorContactsDataset)
        let newSensorContactsCache = newSensorContacts.map(thing => getIri(thing, 'https://www.example.con/contact#webId'))
        // compare the old cache of webids to the new cache
        // if the new cache is longer, filter those webids
        if (newSensorContactsCache.length > sensorContactsCache.length) {
            let newSensorContactsWebIds = newSensorContactsCache.filter(contact => !sensorContactsCache.includes(contact))
            // for each webId that is new, set their agent access to read for each sensor name 
            //    in the sensor container
            for (const webId of newSensorContactsWebIds) {
                for (const resource of containedSensorResourceUris) { 
                    await universalAccess.setAgentAccess(resource, webId, { read: true, write: false }, { fetch: session.fetch })
                }
            }
        }
        // update the cache
        sensorContactsCache = newSensorContactsCache;
    })

    sensorContactsSocket.connect();

    const sensorContainerSocket = new WebsocketNotification(
        sensorContainerResourceUri,
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
        // get a new cache from the resource
        let newSensorContainerResourceDataset = await getSolidDataset(sensorContainerResourceUri, { fetch: session.fetch });
        let newContainedResourceUris = getContainedResourceUrlAll(newSensorContainerResourceDataset);
        // compared the old cache of sensor names to the new cache
        // if the new cache is longer, filter those new sensor uris
        if (newContainedResourceUris.length > containedSensorResourceUris.length) { 
            let newResourceUris = newContainedResourceUris.filter(uri => !containedSensorResourceUris.includes(uri))
            // for each new sensor uri, set their agent access to read for each webid
            //    in the sensor contacts cache
            for (const uri of newResourceUris) {
                for (const webId of sensorContactsCache) {
                    await universalAccess.setAgentAccess(uri, webId, { read: true, write: false }, { fetch: session.fetch})
                }
            }
        }
        
        containedSensorResourceUris = newContainedResourceUris;
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
        // get a new cache of subscribed topics from the resource
        const newSubscribedTopicsDataset = await getSolidDataset(subscribedTopicsUri)
        const newSubscribedTopicsThings = getThingAll(newSubscribedTopicsDataset);
        // if it is shorter
        if (newSubscribedTopicsThings.length < subscribedTopicsThings.length) {
            // filter the old topics
            const topicsToUnsubscribe = subscribedTopicsThings.filter(thing => !newSubscribedTopicsThings.includes(thing))
            // find the appropriate mqtt client from mqttClientCache using broker uri
            let targetMqttClient = mqtt.connect({url})
            // send a client.unsubscribe to the broker
            targetMqttClient.unsubscribe(topicsToUnsubscribe, {}, (err, packet) => {
                if (err) console.log(err);
                console.log(`unsubscribed: ${packet}`)
                // save the remaining dataset to the resource
            })
        } 
        // if it is longer
        else if (newSubscribedTopicsThings.length > subscribedTopicsThings.length) {
            // filter the new topics
            const topicsToSubscribe = newSubscribedTopicsThings.filter(thing => !subscribedTopicsThings.includes(thing))
            let targetMqttClient = mqtt.connect({url})
            // send a client.subscribe to the broker
            targetMqttClient.subscribe(topicsToSubscribe, {}, (err, packet) => {
                if (err) console.log(err);
                console.log(`subscribed: ${packet}`)
                // save the remaining dataset to the resource
            })
        } else {
            return;
        }
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
       

    
}).catch((err) => console.log(err));
