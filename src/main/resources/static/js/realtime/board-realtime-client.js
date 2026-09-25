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

  function publish(event){
    // TODO LAB-06: reject if disconnected, serialize the contract and SEND to
    // /app/boards/{boardId}/events. Keep STOMP details inside this module.
    throw new Error('TODO LAB-06: publish BoardEvent');
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
