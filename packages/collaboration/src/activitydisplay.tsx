import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { User } from '@jupyterlab/services';

import * as React from 'react';

// import { ActivityBarGraph } from './activitybargraph';
import { ActivityDotPlot } from './activitydotplot';
import { Roles } from './roles';

export interface ActivityDisplayComponentProps {

    tracker: INotebookTracker;
    currentUser: User.IManager;
    userRoles: Roles

}

export class ActivityDisplay extends ReactWidget {

    private _tracker: INotebookTracker
    private _currentUser: User.IManager;
    private _roles: Roles;

    constructor(tracker: INotebookTracker, currentUser: User.IManager, roles: Roles) {

        super();

        this._tracker = tracker;
        this._currentUser = currentUser;
        this._roles = roles;

    }

    render() {
        return <ActivityDotPlot tracker={this._tracker} currentUser={this._currentUser} userRoles={this._roles}/>
    }

}
