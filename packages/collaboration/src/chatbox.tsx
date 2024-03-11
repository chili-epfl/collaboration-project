import * as React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { User } from '@jupyterlab/services';

export class Chatbox extends ReactWidget {

    private _currentUser: User.IManager;
    
    constructor(currentUser: User.IManager) {
      super();
      this._currentUser = currentUser;
      this.addClass('jp-ChatboxWidget');
    }

    render(): JSX.Element {
        return <ChatBoxComponent currentUser={this._currentUser} />;
    }
    
}

interface ChatBoxComponentProps {

  currentUser: User.IManager;

}

interface ChatBoxComponentState {

  message: string;
  messages: { 
    message: string; 
    user: User.IIdentity
  }[];

}

const ChatBoxComponent: React.FC<ChatBoxComponentProps> = ({currentUser}) => {

    const user = currentUser;

    const [state, setState] = React.useState<ChatBoxComponentState>({message: '', messages: []});

    const onSend = () => {
      const newMessage = state.message.trim();
      if (newMessage) {
        // Update the messages list with the new message
        setState((prevState) => ({
          message: '',
          messages: [
            ...prevState.messages,
            {
              message: newMessage,
              user: user.identity!,
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
  user: User.IIdentity;

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
        <div className="jp-Chat-UserIcon jp-Chat-UserIconText" style={{ backgroundColor: user.color, marginRight: '5px' }}>
          {user.initials}
        </div>
        <strong style={{ marginRight: '5px' }}>{user.name}</strong>
      </div>
      <div style={{ marginLeft: '25px' }}>
        {lineBreaksMessage}
      </div>
    </div>
  );
}