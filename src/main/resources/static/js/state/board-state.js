function uid(prefix){ return `${prefix}-${crypto.randomUUID()}`; }

export function createBoardState(){
  let board={id:null,name:'Architecture Board',elements:[]};
  let selectedId=null;
  let connectSourceId=null;
  let remote={status:'idle',lastAction:null,error:null};

  return {
    snapshot(){ return structuredClone({board,selectedId,connectSourceId,remote}); },
    setBoard(next){ board=structuredClone(next); selectedId=null; connectSourceId=null; },
    setName(name){ board={...board,name}; },
    select(id){ selectedId=id; },
    selected(){ return board.elements.find(e=>e.id===selectedId) ?? null; },
    setRemote(status,lastAction=null,error=null){ remote={status,lastAction,error}; },
    addRectangle(){
      const e={id:uid('rect'),type:'RECTANGLE',x:100+board.elements.length*12,y:90+board.elements.length*12,width:170,height:70,text:'Component',sourceId:null,targetId:null};
      board={...board,elements:[...board.elements,e]}; selectedId=e.id; return structuredClone(e);
    },
    addText(){
      const e={id:uid('text'),type:'TEXT',x:120,y:210,width:150,height:30,text:'Text',sourceId:null,targetId:null};
      board={...board,elements:[...board.elements,e]}; selectedId=e.id; return structuredClone(e);
    },
    moveSelected(x,y){
      board={...board,elements:board.elements.map(e=>e.id===selectedId && e.type!=='CONNECTOR'?{...e,x,y}:e)};
      return this.selected();
    },
    beginConnect(){
      const source = board.elements.find(e => e.id === selectedId);
      if(source && source.type !== 'CONNECTOR') connectSourceId = selectedId;
    },
    completeConnect(targetId){
      if(!connectSourceId || !targetId || connectSourceId===targetId) return null;
      const target = board.elements.find(e => e.id === targetId);
      if(!target || target.type === 'CONNECTOR') return null;
      const e={id:uid('conn'),type:'CONNECTOR',x:0,y:0,width:0,height:0,text:'',sourceId:connectSourceId,targetId};
      board={...board,elements:[...board.elements,e]}; connectSourceId=null; selectedId=e.id; return structuredClone(e);
    },
    removeSelected(){
      if(!selectedId) return null;
      const removed=selectedId;
      board={...board,elements:board.elements.filter(e=>e.id!==removed && e.sourceId!==removed && e.targetId!==removed)};
      selectedId=null;
      return removed;
    },
    applyEvent(event){
      if(!event || !event.type) return;
      const payload = event.payload ?? {};

      switch(event.type){
        case 'ELEMENT_CREATED':
        case 'CONNECTOR_CREATED': {
          const incoming = payload.element;
          if(!incoming) return;
          const exists = board.elements.some(e => e.id === incoming.id);
          board = {
            ...board,
            elements: exists
                ? board.elements.map(e => e.id === incoming.id ? { ...incoming } : e)
                : [...board.elements, { ...incoming }]
          };
          break;
        }

        case 'ELEMENT_MOVED': {
          const { elementId, x, y } = payload;
          if(!elementId) return;
          board = {
            ...board,
            elements: board.elements.map(e =>
                e.id === elementId && e.type !== 'CONNECTOR' ? { ...e, x, y } : e
            )
          };
          break;
        }

        case 'ELEMENT_UPDATED': {
          const incoming = payload.element;
          if(!incoming) return;
          board = {
            ...board,
            elements: board.elements.map(e => e.id === incoming.id ? { ...incoming } : e)
          };
          break;
        }

        case 'ELEMENT_DELETED': {
          const { elementId } = payload;
          if(!elementId) return;
          if(selectedId === elementId) selectedId = null;
          if(connectSourceId === elementId) connectSourceId = null;
          board = {
            ...board,
            elements: board.elements.filter(e =>
                e.id !== elementId && e.sourceId !== elementId && e.targetId !== elementId
            )
          };
          break;
        }

        default:
          console.warn('Unknown BoardEvent type', event.type);
      }
    },
    toPersistedBoard(){ return structuredClone(board); }
  };
}