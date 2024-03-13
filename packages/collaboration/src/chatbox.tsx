import * as React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { User } from '@jupyterlab/services';

import { WebSocketAwarenessProvider, IChatMessage } from '@jupyter/docprovider';

export class Chatbox extends ReactWidget {

    private _currentUser: User.IManager;
    private _awarenessProvider: WebSocketAwarenessProvider;
    
    constructor(currentUser: User.IManager, awarenessProvider: WebSocketAwarenessProvider) {
      super();
      this._currentUser = currentUser;
      this._awarenessProvider = awarenessProvider;
      this.addClass('jp-ChatboxWidget');
    }

    render(): JSX.Element {
        return <ChatBoxComponent currentUser={this._currentUser} awarenessProvider={this._awarenessProvider}/>;
    }
    
}

interface ChatBoxComponentProps {

  currentUser: User.IManager;
  awarenessProvider: WebSocketAwarenessProvider;

}

interface ChatBoxComponentState {

  message: string;
  messages: { 
    message: string; 
    user: string
  }[];

}

const ChatBoxComponent: React.FC<ChatBoxComponentProps> = ({currentUser, awarenessProvider}) => {

    const user = currentUser;
    const aProvider = awarenessProvider;

    const [state, setState] = React.useState<ChatBoxComponentState>({message: '', messages: []});

    aProvider.messageStream.connect((_, newMessage: IChatMessage) => {

      setState((prevState) => ({
        ...prevState,
        messages: [
          ...prevState.messages,
          {
            message: newMessage.content.body,
            user: newMessage.sender
          }
        ]
      }));

    })

    const onSend = () => {
      const newMessage = state.message.trim();
      if (newMessage) {

        aProvider.sendMessage(newMessage);

        setState((prevState) => ({
          message: '',
          messages: [
            ...prevState.messages,
            {
              message: newMessage,
              user: user.identity!.name,
            },
          ],
        }));

      }
    };

    const keyPressHandler: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {

      if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        onSend(); 
      }

    };

    const displayFiedRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {

      if (displayFiedRef.current) {
        displayFiedRef.current.scrollTop = displayFiedRef.current.scrollHeight;
      }

    }, [state.messages]);

    return (
        <div>
          {/* Display field */}
          <div className='jp-Chat-DisplayField' ref={displayFiedRef}>
            {state.messages.map((msg, index) => (
              <ChatBoxMessage key={index} message={msg.message} user={msg.user} />
            ))}
          </div>
    
          {/* Writable field */}
          <div className='jp-Chat-WritableFieldBox'>
            <textarea
              value={state.message}
              onChange={(e) => setState({ ...state, message: e.target.value})}
              placeholder="Type a message..."
              onKeyDown={ keyPressHandler }
              className='jp-Chat-WritableField'
            />
            
            {/* Send button */}
            <button onClick={onSend} style={{ padding: '8px' }}>
              Send
            </button>
          </div>
        </div>
      );

}


interface ChatBoxMessageProps {

  message: string;
  user: string

}

const ChatBoxMessage: React.FC<ChatBoxMessageProps> = ({message, user}) => {

  const lineBreaksMessage = message.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className='jp-Chat-Message'>
      <div style={{ display: 'flex', alignItems: 'center' }}>

        <strong style={{ marginRight: '5px' }}>{user}</strong>
      </div>
      <div>
        {lineBreaksMessage}
      </div>
    </div>
  );
}