import { User } from '@jupyterlab/services';
import { Awareness } from 'y-protocols/awareness';

import { IChatMessage, WebSocketAwarenessProvider } from '@jupyter/docprovider';
import { ICollaboratorAwareness } from './tokens';

import * as msgEnc from './messageEncoding';

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
    private _collaborators: User.IIdentity[] = [];
    private _map = new Map<User.IIdentity, Role>;
    private _awareness: Awareness;
    private _aProvider: WebSocketAwarenessProvider;

    constructor(currentUser: User.IManager, awareness: Awareness, aProvider: WebSocketAwarenessProvider) {
        this._awareness = awareness;
        this._aProvider = aProvider;

        this._awareness.on('change', this._onAwarenessChanged);

        this._aProvider.messageStream.connect(this._onMessageReceived, this);

        // TODO: are you the owner of the files? If yes, add a map pair with your name and Owner; else you're a Student for now
    }

    // Handle collaborator change
    private _onAwarenessChanged = () => {
        const state = this._awareness.getStates() as any;
        const collaborators: User.IIdentity[] = [];

        state.forEach((value: ICollaboratorAwareness, key: any) => {
            collaborators.push(value.user);
        });

        this._collaborators = collaborators;

        const map = new Map<User.IIdentity, Role>;

        this._collaborators.forEach(c => {
            let cRole = this._map.get(c);

            if (cRole === undefined) {
                map.set(c, 0);
            } else {
                map.set(c, cRole);
            }
        });

        this._map = map;

        // Debug line; REMOVE
        Array.from(this._map.keys()).forEach(k => console.log(k.name, ': ', this._map.get(k)));

    }

    // Externally set a user's role
    set(key: User.IIdentity, value: Role): void {
        this._map.set(key, value);
        this._aProvider.sendMessage(msgEnc.roleUpdateToString({
            user: key.username,
            role: value
        }));
    }

    // Externally get a user's role
    get(key: User.IIdentity): Role | undefined {
        return this._map.get(key);
    }

    // Handles incoming role changes from external users
    private _onMessageReceived(_: any, newMessage: IChatMessage) : void {
        const parts = newMessage.content.body.split('♠');
        if (parts[0] === 'rup') {
            const decMessage = msgEnc.stringToRoleUpdate(newMessage.content.body);

            const user = this._usernameToId(decMessage.user);

            this._map.set(user!, decMessage.role);

        }
    }

    // Helper function for _onMessageReceived
    private _usernameToId(username: string): User.IIdentity | undefined {
        Array.from(this._map.keys()).forEach(k => {if (k.username === username) return k});

        return undefined;

    }

}