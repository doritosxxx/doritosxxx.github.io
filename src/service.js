import msf from './msf/src';


const GATEWAY_SERVICE = 'com.webos.service.secondscreen.gateway';
const CREATE_APPCHANNEL_URI = 'luna://com.webos.service.secondscreen.gateway/app2app/createAppChannel';
const REGISTER_SERVER_STATUS_URI = 'luna://com.palm.bus/signal/registerServerStatus';

function callService(uri, params){
    // @ts-expect-error ...
    const service = new window.PalmServiceBridge();
    const promise = new Promise((resolve) => {
        service.onservicecallback = (raw) => resolve(JSON.parse(raw));
        service.call(uri, !params ? '{}' : JSON.stringify(params));
    });
    
    return promise;
}

// interface T1 {
//     connected: boolean;
//     serviceName: string;
// };

// interface T2 {
//     returnValue: boolean;
//     socketUrl: string;
// }


export const webosEffect = (log) => {

    callService(REGISTER_SERVER_STATUS_URI, {
        subscribe: true,
        serviceName: GATEWAY_SERVICE,
    }).then(response => {
        if (response.connected) {
            callService(CREATE_APPCHANNEL_URI).then(response => {
                if (response.returnValue) {
                    const ws = new WebSocket(response.socketUrl);
                    ws.onmessage = (message) => {
                        console.log(`ws message: ${message}`);
                        log(String(message));
                    };
                    ws.onerror = (error) => console.error(`ws error: ${error}`);
                    ws.onclose = () => console.log('ws closed');
                }
            });
        }
    });
};

// function getByURI(uri: string): Promise<{
//     uri: string;
//     version: string;
//     device: Record<any, any>;
// }> {

//     const  oReq = new XMLHttpRequest();
//     oReq.timeout = 5000;

//     return new Promise((resolve, reject) => {
//         oReq.ontimeout = reject;
//         oReq.onload = function () {
//             if (this.status === 200) {
//                 try {
//                     const result = JSON.parse(this.responseText);
//                     resolve(result);
//                 } catch (e) {
//                     reject(e); 
//                 }
//             } else {
//                 reject();
//             }
//         };

//         oReq.open('get', uri, true);
//         oReq.send();   
//     });

// }

const MSF_CHANNEL_ID = 'ru.yandex.idk';

export const tizenEffect = (log) => {
    // getByURI('http://127.0.0.1:8001/api/v2/').then(console.log);
    msf.local((_, service) => {
        console.log("create msf service", _, service)
        const channel = service.channel(MSF_CHANNEL_ID);

        channel.on('say', function (msg, from) {
            log(msg + ' ' + from.attributes.name || 'Unknown');
        });

        channel.on('clientConnect', function (client) {
            log('connect ' + client.attributes.name);
        });

        channel.on('clientDisconnect', function (client) {
            log('Goodbye ' + client.attributes.name);
        });

        channel.on('connect', function () {
            log('Eureka! ... You\'re connected.');
        });

        channel.on('disconnect', function () {
            log('Disconnected');
        });
    });
};

export const tizenSearch = () => {
    return msf.search();
}
