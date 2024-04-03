import { User } from '@jupyterlab/services';
import { Awareness } from 'y-protocols/awareness';

import { WebSocketAwarenessProvider } from '@jupyter/docprovider';
import { ICollaboratorAwareness } from './tokens';


export enum Role {
    Student,
    Teacher,
    Owner
}

export class Roles {
    private _collaborators: User.IIdentity[] = [];
    private _map = new Map<User.IIdentity, Role>;
    private _awareness: Awareness;
//    private _aProvider: WebSocketAwarenessProvider;

    constructor(currentUser: User.IManager, awareness: Awareness, aProvider: WebSocketAwarenessProvider) {
        this._awareness = awareness;
//        this._aProvider = aProvider;

        this._awareness.on('change', this._onAwarenessChanged);

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

        Array.from(this._map.keys()).forEach(k => console.log(k.name, ': ', this._map.get(k)));

    }

    set(key: User.IIdentity, value: Role): void {
        this._map.set(key, value);
        // TODO: send webSocket message to update roles for everyone
    }

    get(key: User.IIdentity): Role | undefined {
        return this._map.get(key);
    }

}