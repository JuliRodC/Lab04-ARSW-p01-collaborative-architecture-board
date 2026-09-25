export function createBoardRealtimeClient({onEvent=()=>{},onStatus=()=>{}}={}){
  let client=null;
  let subscription=null;
  let currentBoardId=null;

  function webSocketUrl(){
    const protocol=location.protocol==='https:'?'wss':'ws';
    return `${protocol}://${location.host}/ws`;
  }

  function connect(boardId){
    if(!boardId) return Promise.reject(new Error('boardId is required before connecting'));
    if(!window.Stomp) return Promise.reject(new Error('STOMP client library was not loaded'));
    if(client?.connected && currentBoardId===boardId) return Promise.resolve();

    return new Promise((resolve,reject)=>{
      onStatus('connecting');
      const socket=new WebSocket(webSocketUrl());
      client=window.Stomp.over(socket);
      client.debug=()=>{};
      client.connect({},()=>{
        currentBoardId=boardId;
        subscription=client.subscribe(`/topic/boards/${boardId}`,message=>{
          try { onEvent(JSON.parse(message.body)); }
          catch(error){ console.error('Invalid board event',error); }
        });
        onStatus('connected');
        resolve();
      },error=>{
        onStatus('error');
        reject(error instanceof Error?error:new Error(String(error)));
      });
    });
  }

  // Envía un BoardEvent al servidor. Los detalles de STOMP (destino, headers,
  // serialización) quedan encapsulados aquí; app.js solo entrega el evento.
  function publish(event){
    if(!client?.connected || !currentBoardId){
      return Promise.reject(new Error('Not connected to the live channel'));
    }
    if(!event?.boardId){
      return Promise.reject(new Error('BoardEvent.boardId is required'));
    }
    if(event.boardId!==currentBoardId){
      return Promise.reject(new Error(`BoardEvent belongs to ${event.boardId}, but the live channel is ${currentBoardId}`));
    }
    try {
      client.send(`/app/boards/${currentBoardId}/events`,
        {'content-type':'application/json'},
        JSON.stringify(event));
      return Promise.resolve(event);
    } catch(error){
      return Promise.reject(error instanceof Error?error:new Error(String(error)));
    }
  }

  function disconnect(){
    return new Promise(resolve=>{
      subscription?.unsubscribe?.(); subscription=null;
      if(client?.connected){ client.disconnect(()=>{ client=null; currentBoardId=null; onStatus('disconnected'); resolve(); }); }
      else { client=null; currentBoardId=null; onStatus('disconnected'); resolve(); }
    });
  }

  return {
    connect,
    publish,
    disconnect,
    isConnected(){ return Boolean(client?.connected); },
    boardId(){ return currentBoardId; }
  };
}
