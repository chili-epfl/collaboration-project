import { INotebookTracker } from '@jupyterlab/notebook';
import { User } from '@jupyterlab/services';

import { Awareness } from 'y-protocols/awareness';
import { ICollaboratorAwareness } from './tokens';
import { IChatMessage, WebSocketAwarenessProvider } from '@jupyter/docprovider';

import * as msgEnc from './messageEncoding';

export interface UserActivity {
    file: string,
    cell: number
}


export class CellTracker {

    private _aProvider: WebSocketAwarenessProvider;
    private _awareness: Awareness;
    private _currentActivity: UserActivity = { file: '', cell: -1 };
    private _currentUser: User.IManager;
    private _justChangedFiles: boolean = false;
    private _tracker: INotebookTracker;
    private _userActivity: number[] = [];

    constructor(currentUser: User.IManager, awareness: Awareness, aProvider: WebSocketAwarenessProvider, tracker: INotebookTracker) {
        this._aProvider = aProvider;
        this._awareness = awareness;
        this._currentUser = currentUser;
        this._tracker = tracker;

        this._aProvider.messageStream.connect(this._onMessageReceived, this);
        this._tracker.activeCellChanged.connect(this._onCellChanged, this);
        this._tracker.currentChanged.connect(this._onFileChanged, this);

        // Remove current activity when user disconnects
        window.addEventListener('beforeunload', () => {this._aProvider.sendMessage(msgEnc.actDelToString(this._currentActivity))});

    }

    private _updateActivity = () => {
        
        const state = this._awareness.getStates() as any;
        let currentFile;

        state.forEach((value: ICollaboratorAwareness, key: any) => {

            if (value.user.username === this._currentUser.identity!.username) currentFile = value.current?.split(':');

        })

        if (currentFile === undefined) return;

        const cellIndex = this._tracker.currentWidget?.content.activeCellIndex;

        if (cellIndex === undefined) return;

        this._currentActivity = { file: currentFile[2], cell: cellIndex };
    }

    // Clear tracker data when changing files
    private _onFileChanged = () => {

        this._justChangedFiles = true;
        this._userActivity = [];

        setTimeout(() => {this._aProvider.sendMessage('activity')}, 700);

    }

    // Notice others when changing cells
    private _onCellChanged = () => {

        if (this._justChangedFiles) {

            this._justChangedFiles = false;
            return;
        }

        const oldActivity = this._currentActivity;

        setTimeout(() => {
            this._updateActivity();
            if (this._currentActivity.cell >= 0) {
                while (this._userActivity.length <= this._currentActivity.cell) this._userActivity.push(0);

                this._userActivity[this._currentActivity.cell]++;

                if (this._currentActivity.file === oldActivity.file && oldActivity.cell >= 0) this._userActivity[oldActivity.cell]--;

                this._logActivity();
            }
        }, 100);

        setTimeout(() => {

            if (oldActivity.file === this._currentActivity.file && oldActivity.cell === this._currentActivity.cell) return;

            this._aProvider.sendMessage(msgEnc.actDelToString(oldActivity));
            this._aProvider.sendMessage(msgEnc.activityToString(this._currentActivity));
        }, 700);

    }

    private _onMessageReceived = (_: any, newMessage: IChatMessage) => {
        
        const parts = newMessage.content.body.split('♠');

        // If activity request, send the user's activity
        if (parts[0] === 'activity') {

            this._aProvider.sendMessage(msgEnc.activityToString(this._currentActivity));

        // If activity in the user's file, add it to the file's activity log
        } else if (parts[0] === 'act') {

            const decMessage = msgEnc.stringToActivity(newMessage.content.body);

            if (decMessage.file === this._currentActivity.file && decMessage.cell >= 0) {
                while (this._userActivity.length <= decMessage.cell) this._userActivity.push(0);

                this._userActivity[decMessage.cell]++;
                this._logActivity();
            }

        // If the user should delete activity, do so
        } else if (parts[0] === 'del') {

            const decMessage = msgEnc.stringToActivity(newMessage.content.body);

            if (decMessage.file === this._currentActivity.file && decMessage.cell >= 0) {

                this._userActivity[decMessage.cell]--;
            } 

        }

    }

    // Cool little debug log function
    private _logActivity = () => {

        this._userActivity.forEach((element, index) => console.log(`Cell ${index}: ${element}`));

    }

}