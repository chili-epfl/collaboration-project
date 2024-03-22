import * as React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { User } from '@jupyterlab/services';

import { WebSocketAwarenessProvider, IChatMessage } from '@jupyter/docprovider';

import * as msgEnc from './messageEncoding';

export interface Poll {
    sender: string,
    question: string,
    n_answers: number,
    answers: string[],
    total_answers: number,
    results: number[]
}

export class PollList extends ReactWidget {

    private _currentUser: User.IManager;
    private _awarenessProvider: WebSocketAwarenessProvider;

    constructor(currentUser: User.IManager, awarenessProvider: WebSocketAwarenessProvider) {
        super();
        this._currentUser = currentUser;
        this._awarenessProvider = awarenessProvider;
        this.addClass('.jp-Poll-Panel');
    }

    render(): JSX.Element {
        return <PollListComponent currentUser={this._currentUser} awarenessProvider={this._awarenessProvider}/>;
    }

}

interface PollListComponentProps {
    currentUser: User.IManager,
    awarenessProvider: WebSocketAwarenessProvider
}

interface PollListState {
    question: string,
    answers: string[],
    polls: Poll[]
}

const PollListComponent: React.FC<PollListComponentProps> = ({currentUser, awarenessProvider}) => {

    const user = currentUser;
    const aProvider = awarenessProvider;

    // Getter and setter for the poll state
    const [state, setState] = React.useState<PollListState>({question: '', answers: ['', ''], polls: []});

    const displayFiedRef = React.useRef<HTMLDivElement>(null);

    // Scrolls down automatically to always display newer polls
    React.useEffect(() => {

      if (displayFiedRef.current) {
        displayFiedRef.current.scrollTop = displayFiedRef.current.scrollHeight;
      }

    }, [state.polls]);


    // Adds an answer option
    const addAnswer = () => {
        if (state.answers.length < 4) {
            setState(prevState => ({
                ...prevState,
                answers: [...prevState.answers, '']
            }));
        }
    }

    // Deletes an answer option
    const deleteAnswer = (index: number) => {
        setState(prevState => ({
            ...prevState,
            answers: prevState.answers.filter((_, i) => i !== index)
        }));
    }

    // Sends new polls
    const onSend = () => {

        console.log('neg');

        const newQuestion = state.question.trim();
        const newAnswers = state.answers.map(_ => _.trim()).filter(ans => ans !== '');

        if (newQuestion && newAnswers.length >= 2) {

            const newPoll: Poll = {
                sender: user.identity!.name,
                question: newQuestion,
                n_answers: newAnswers.length,
                answers: newAnswers,
                total_answers: 0,
                results: new Array(newAnswers.length).fill(0)
            }

            aProvider.sendMessage(msgEnc.pollToString(newPoll));

            setState((prevState) => ({
                question: '',
                answers: ['', ''],
                polls: [...prevState.polls, newPoll]
            }));
        }
    }

    // Listens for new polls and adds them to the list (TODO)
    React.useEffect(() => {
        const pollHandler = (_: any, newMessage: IChatMessage) => {
            const newPoll = msgEnc.stringToPoll(newMessage.content.body);
            setState((prevState) => ({
                ...prevState,
                polls: [...prevState.polls, newPoll]
            }));
        };

        aProvider.messageStream.connect(pollHandler);

        return () => {
            aProvider.messageStream.disconnect(pollHandler);
        }
    }, []);

    // Listens for changes in poll results and updates them (TODO)

    return (
        <div>
            {/* Poll display field */}
            <div className='jp-Chat-DisplayField' ref={displayFiedRef}>
                {state.polls.map((poll, index) => (
                    <PollDisplay key={index} poll={poll} currentUser={user}/>
                ))}
            </div>

            {/* Poll question field */}
            <div className='jp-Poll-QuestionFieldBox'>
                <textarea
                    value = {state.question}
                    onChange={(e) => setState({question: e.target.value, answers: state.answers, polls: state.polls})}
                    placeholder='Your question here...'
                    className='jp-Poll-QuestionField'
                />
            </div>

            {/* Poll answer fields */}
            {state.answers.map((answer, index) => (
                <div key={index} className='jp-Poll-AnswerFieldBox'>
                    <textarea
                        value={answer}
                        onChange={(e) => {
                            const newAnswers = [...state.answers];
                            newAnswers[index] = e.target.value;
                            setState({ ...state, answers: newAnswers });
                        }}
                        placeholder={`Answer ${index + 1}`}
                        className='jp-Poll-AnswerField'
                    />
                    {state.answers.length > 2 && (
                        <button onClick={() => deleteAnswer(index)} className='jp-Poll-DeleteButton'>
                            X
                        </button>
                    )}
                </div>
            ))}

            {/* Add answer button */}
            <div>
                {state.answers.length < 4 && (
                    <button onClick={addAnswer} className='jp-Poll-AddAnswerButton'>
                        +
                    </button>
                )}
            </div>
  
            {/* Send button */}
            <div>
                <button onClick={onSend} className='jp-Poll-SendButton'>
                    Send
                </button>                
            </div>
        </div>


    );

}

interface PollDisplayProps {
    poll: Poll;
    currentUser: User.IManager;
}

const PollDisplay: React.FC<PollDisplayProps> = ({poll, currentUser}) => {
    return (
        <div className='jp-Poll-PollDisplay'>
            <div className={`jp-Poll-SenderDisplay ${poll.sender === currentUser.identity!.name ? 'underline' : ''}`}>{poll.sender}</div>
            <div className='jp-Poll-QuestionDisplay'>{poll.question}</div>
            <div className="jp-Poll-AnswerContainer">
                {poll.answers.map((answer, index) => (
                    <div key={index} className='jp-Poll-AnswerDisplay'>{answer}</div>
                ))}
            </div>
            <style>
                {`.underline { text-decoration: underline; }`}
            </style>
        </div>
    );
}