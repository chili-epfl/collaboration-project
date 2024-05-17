import { IChatMessage, WebSocketAwarenessProvider } from '@jupyter/docprovider';
import { User } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';

import { Awareness } from 'y-protocols/awareness';


import { showOwnerDialog } from './ownerdialog';
import { ICollaboratorAwareness } from './tokens';
import * as msgEnc from './messageEncoding';

import * as time from 'lib0/time';


export enum Role {
    Student,
    Teacher,
    Owner
}

export interface RoleUpdate {
    user: string,
    role: Role
}

export class Roles {
    private _collaborators: string[] = [];
    private _map = new Map<string, Role>;
    private _awareness: Awareness;
    private _aProvider: WebSocketAwarenessProvider;
    private _connectedAt: number;
    private _currentUser: User.IManager;
    private _translator: ITranslator | null;

    constructor(currentUser: User.IManager, awareness: Awareness, aProvider: WebSocketAwarenessProvider, translator: ITranslator | null) {
        this._awareness = awareness;
        this._aProvider = aProvider;
        this._connectedAt = time.getUnixTime();
        this._currentUser = currentUser;
        this._translator = translator;

        this._awareness.on('change', this._onAwarenessChanged);

        this._aProvider.messageStream.connect(this._onMessageReceived, this);

        this._map.set(currentUser.identity!.username, Role.Owner);

        // Once connection is set, receive everyone's roles to populate the user's role map
        setTimeout(() => {this._aProvider.sendMessage('roles')}, 400);

        // Once connection is set, request other users' timestamps to check if one came before 
        setTimeout(() => {this._aProvider.sendMessage('times')}, 500);

        setTimeout(async () => {
            if (this._map.get(currentUser.identity!.username) === Role.Owner) {

                await showOwnerDialog(this._translator);

            }
        }, 1000);

    }

    // Handle collaborator change
    private _onAwarenessChanged = () => {

        const state = this._awareness.getStates() as any;
        const collaborators: string[] = [];

        state.forEach((value: ICollaboratorAwareness, key: any) => {
            collaborators.push(value.user.username);
        });

        this._collaborators = collaborators;

        const map = new Map<string, Role>;

        this._collaborators.forEach(c => {
            let cRole = this._map.get(c);

            if (cRole === undefined) {
                map.set(c, Role.Student);

            } else {
                map.set(c, cRole);
            }

        });

        this._map = map;

    }

    // Externally set a user's role
    set(key: string, value: Role): void {
        this._map.set(key, value);
        this._aProvider.sendMessage(msgEnc.roleUpdateToString({
            user: key,
            role: value
        }));
    }

    // Externally get a user's role
    get(key: string): Role | undefined {
        return this._map.get(key);
    }

    // Handles incoming messages
    private _onMessageReceived(_: any, newMessage: IChatMessage) : void {
        const parts = newMessage.content.body.split('♠');

        // If role update, update the map
        if (parts[0] === 'rup') {
            const decMessage = msgEnc.stringToRoleUpdate(newMessage.content.body);
            this._map.set(decMessage.user, decMessage.role);

        // If timestamp request, send the user's timestamp
        } else if (parts[0] === 'times') {
            this._aProvider.sendMessage(msgEnc.timestampToString(this._connectedAt));

        // If timestamp, check if they connected before the user
        } else if (parts[0] === 'stamp') {
            const time = msgEnc.stringToTimestamp(newMessage.content.body);

            if (time < this._connectedAt && this._map.get(this._currentUser.identity!.username) === Role.Owner) {
                this.set(this._currentUser.identity!.username, Role.Student);
            }

        // If role request, send the user's role
        } else if (parts[0] === 'roles') {
            this._aProvider.sendMessage(msgEnc.roleUpdateToString({
                user: this._currentUser.identity!.username,
                role: this._map.get(this._currentUser.identity!.username)!
            }));
        }
    }

}