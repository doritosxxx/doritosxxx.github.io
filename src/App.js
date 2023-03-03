import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { tizenEffect, tizenSearch } from './service';


function Message ({message, index}) {
    return <div>{`${index}) ${message}`}</div>
}

function App() {
    const [messages, setMessages] = useState([]);
    const pushMessage = useCallback((message) => setMessages(oldMessages => [...oldMessages, message]), []);

    console.log(pushMessage);
    useEffect(() => {
        tizenEffect(pushMessage);
    },[pushMessage]);

    useEffect(() => {
        const search = tizenSearch();
        search.on('found', service => {
            console.log("found ", service);
        });

        // search.start();

        

        return () => search.stop();
    });

    return (
        <div className="App">
            {messages.map((message, index) => <Message key={message} message={message} index={index}/>)}
            <button>send message</button>
        </div>
    );
}

export default App;
