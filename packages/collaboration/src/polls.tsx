import * as React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { User } from '@jupyterlab/services';

import { WebSocketAwarenessProvider, IChatMessage } from '@jupyter/docprovider';

import * as msgEnc from './messageEncoding';
import { Roles, Role } from './roles';

const MIN_N_ANSWERS = 2;
const MAX_N_ANSWERS = 4;

export interface Poll {
    sender: string,
    question: string,
    n_answers: number,
    answers: string[],
    total_answers: number,
    results: number[]
}

export interface PollUpdate {
    index: number,
    total_answers: number,
    results: number[]
}



export class PollList extends ReactWidget {

    private _currentUser: User.IManager;
    private _awarenessProvider: WebSocketAwarenessProvider;
    private _roles: Roles;

    constructor(currentUser: User.IManager, awarenessProvider: WebSocketAwarenessProvider, roles: Roles) {
        super();
        
        this._currentUser = currentUser;
        this._awarenessProvider = awarenessProvider;
        this._roles = roles;

        this.addClass('jp-Poll-Panel');
    }

    render(): JSX.Element {
        return <PollListComponent currentUser={this._currentUser} awarenessProvider={this._awarenessProvider} userRoles={this._roles}/>;
    }

}

interface PollListComponentProps {
    currentUser: User.IManager,
    awarenessProvider: WebSocketAwarenessProvider,
    userRoles: Roles
}

interface PollListState {
    question: string,
    answers: string[],
    polls: Poll[]
}

const PollListComponent: React.FC<PollListComponentProps> = ({currentUser, awarenessProvider, userRoles}) => {

    const user = currentUser;
    const aProvider = awarenessProvider;
    const roles = userRoles;

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
        if (state.answers.length < MAX_N_ANSWERS) {
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

        const newQuestion = state.question.trim();
        const newAnswers = state.answers.map(_ => _.trim()).filter(ans => ans !== '');

        if (newQuestion && newAnswers.length >= MIN_N_ANSWERS) {

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

    // Handles voting in a poll
    const vote = (pollIndex: number, answerIndex: number) => {
        const updatedPolls = [...state.polls];
        updatedPolls[pollIndex].results[answerIndex]++;
        updatedPolls[pollIndex].total_answers++;

        setState((prevState) => ({ 
            ...prevState, 
            polls: updatedPolls 
        }));

        aProvider.sendMessage(msgEnc.pollUpdateToString({
            index: (state.polls.length - 1) - pollIndex,
            total_answers: updatedPolls[pollIndex].total_answers,
            results: updatedPolls[pollIndex].results
        }))
    };

    // Listens for new polls (or updates) and adds them to the list
    React.useEffect(() => {
        const pollHandler = (_: any, newMessage: IChatMessage) => {
            const parts = newMessage.content.body.split('♠');

            if (parts[0] === 'pll') {
                const newPoll = msgEnc.stringToPoll(newMessage.content.body);
                setState((prevState) => ({
                    ...prevState,
                    polls: [...prevState.polls, newPoll]
                }));

            } else if (parts[0] === 'upd') {
                const update = msgEnc.stringToPollUpdate(newMessage.content.body);
                setState((prevState) => {
                    const updatedPolls = [...prevState.polls];
                    const index = (prevState.polls.length - 1) - update.index;
                    if (index >= 0) {
                        updatedPolls[index].total_answers = update.total_answers;
                        updatedPolls[index].results = update.results;
                    }
                    return {
                        ...prevState,
                        polls: updatedPolls
                    };
                });
            }
        };

        aProvider.messageStream.connect(pollHandler);

        return () => {
            aProvider.messageStream.disconnect(pollHandler);
        }
    }, []);

    return (
        <div>
            {/* Poll display field */}
            <div className='jp-Chat-DisplayField' ref={displayFiedRef}>
                {state.polls.map((poll, index) => (
                    <PollDisplay key={index} poll={poll} currentUser={user} vote={(answerIndex) => vote(index, answerIndex)}/>
                ))}
            </div>

            {/* Allow poll creation only if user isn't a student */}
            {roles.get(user.identity!.username) !== Role.Student && (
                <div>
                    {/* Poll question field */}
                    <div className='jp-Poll-QuestionFieldBox'>
                        <textarea
                            value={state.question}
                            onChange={(e) => setState({ ...state, question: e.target.value })}
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
                            {state.answers.length > MIN_N_ANSWERS && (
                                <button onClick={() => deleteAnswer(index)} className='jp-Poll-DeleteButton'>
                                    X
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add answer button */}
                    <div>
                        {state.answers.length < MAX_N_ANSWERS && (
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
            )}
        </div>


    );

}

interface PollDisplayProps {
    poll: Poll;
    currentUser: User.IManager;
    vote: (answerIndex: number) => void;
}

const PollDisplay: React.FC<PollDisplayProps> = ({ poll, currentUser, vote }) => {
    // Getter and setter for the "voted" property of the poll
    const [voted, setVoted] = React.useState<boolean>(false);

    // Handles voting for a specific answer
    const handleVote = (index: number) => {
        if (!voted) {
            vote(index);
            setVoted(true);
        }
    };

    return (
        <div className="jp-Poll-PollDisplay">
            <div className={`jp-Poll-SenderDisplay ${poll.sender === currentUser.identity!.name ? 'underline' : ''}`}>
                {poll.sender}
            </div>
            <div className="jp-Poll-QuestionDisplay">{poll.question}</div>
            <div className="jp-Poll-AnswerContainer">
                {poll.answers.map((answer, index) => (
                    <div key={index} className={`jp-Poll-AnswerDisplay ${voted ? 'jp-Poll-AnswerDisplay-Voted' : ''}`} onClick={() => handleVote(index)}>
                        <div className="jp-Poll-AnswerText">{answer}</div>
                        {voted && (
                            <div className="jp-Poll-ProgressBar">
                                <div className="jp-Poll-Progress" style={{ width: `${(poll.results[index] / poll.total_answers) * 100}%` }}></div>
                            </div>
                        )}
                        {voted && (
                            <div className="jp-Poll-Percentage">{((poll.results[index] / poll.total_answers) * 100).toFixed(2)}%</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}