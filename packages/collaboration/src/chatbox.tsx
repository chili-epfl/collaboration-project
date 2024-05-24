import * as React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { User } from '@jupyterlab/services';

import { WebSocketAwarenessProvider, IChatMessage } from '@jupyter/docprovider';

import * as msgEnc from './messageEncoding';

export class Chatbox extends ReactWidget {

    private _currentUser: User.IManager;
    private _awarenessProvider: WebSocketAwarenessProvider;
    
    constructor(currentUser: User.IManager, awarenessProvider: WebSocketAwarenessProvider) {
      super();
      
      this._currentUser = currentUser;
      this._awarenessProvider = awarenessProvider;

      this.addClass('jp-Chat-Panel')
    }

    focusOnWritingField(username?: string) {

      const writingField = this.node?.querySelector('.jp-Chat-WritableField') as HTMLTextAreaElement | null;

      if (writingField) {

        writingField.focus();

        if (username) {

          writingField.value = `@${username} `;

        }

      }

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

    // Getter and setter for the chat state
    const [state, setState] = React.useState<ChatBoxComponentState>({message: '', messages: []});

    // Listens for new messages and adds them to the chat
    React.useEffect(() => {
      const messageHandler = (_: any, newMessage: IChatMessage) => {
        const parts = newMessage.content.body.split('♠');
        if (parts[0] === 'icm') {
          const decMessage = msgEnc.stringToMsg(newMessage.content.body);
          setState((prevState) => ({
            ...prevState,
            messages: [
              ...prevState.messages,
              {
                message: decMessage.content.body,
                user: decMessage.sender
              }
            ]
          }));
        }
      };

      aProvider.messageStream.connect(messageHandler);

      return () => {
          aProvider.messageStream.disconnect(messageHandler);
      };
    }, []);

    // Sends new messages
    const onSend = () => {
      const newMessage = state.message.trim();
      if (newMessage) {
        aProvider.sendMessage(msgEnc.msgToString({
          sender: user.identity!.name,
          timestamp: Date.now(),
          content: {
            type: 'text',
            body: newMessage
          }
        }));

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

    // Sends messages by pressing 'enter'
    const keyPressHandler: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {

      if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        onSend(); 
      }

    };

    const displayFiedRef = React.useRef<HTMLDivElement>(null);

    // Scrolls down automatically to always display newer messages
    React.useEffect(() => {
      if (displayFiedRef.current) {
        displayFiedRef.current.scrollTop = displayFiedRef.current.scrollHeight;
      }
    }, [state.messages]);

    return (
      <div>
        {/* Message display field */}
        <div className='jp-Chat-DisplayField' ref={displayFiedRef}>
          {state.messages.map((msg, index) => (
            <ChatBoxMessage key={index} message={msg.message} user={msg.user} currentUser={user}/>
          ))}
        </div>
    
        {/* Message writing field */}
        <div className='jp-Chat-WritableFieldBox'>
          <textarea
            value={state.message}
            onChange={(e) => setState({ ...state, message: e.target.value})}
            placeholder='Type a message...'
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
  user: string;
  currentUser: User.IManager

}

const ChatBoxMessage: React.FC<ChatBoxMessageProps> = ({message, user, currentUser}) => {

  const tagged = message.includes(`@${currentUser.identity!.name}`);

  const messageClass = tagged ? 'jp-Chat-Message-tagged' : 'jp-Chat-Message';

  // Adds line breaks back to the message
  const lineBreaksMessage = message.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className={messageClass}>
      <div style={{ display: 'flex', alignItems: 'center' }}>

        <strong style={{ marginRight: '5px', textDecoration: ((user === currentUser.identity!.name) ? 'underline' : 'none')}}>{user}</strong>
      </div>
      <div>
        {lineBreaksMessage}
      </div>
    </div>
  );
}