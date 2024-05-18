import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { User } from '@jupyterlab/services';

import * as React from 'react';

import { ActivityBarGraph } from './activitybargraph';
import { ActivityDotPlot } from './activitydotplot';
import { Role, Roles } from './roles';

export interface ActivityDisplayComponentProps {

    tracker: INotebookTracker;
    currentUser: User.IManager;
    userRoles: Roles

}

export interface GraphProps {

    tracker: INotebookTracker

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
        return <ActivityDisplayComponent tracker={this._tracker} currentUser={this._currentUser} userRoles={this._roles}/>
    }

}

const ActivityDisplayComponent: React.FC<ActivityDisplayComponentProps> = ({tracker, currentUser, userRoles}) => {

    const [showBarGraph, setShowBarGraph] = React.useState(true);

    const switchGraph = () => {setShowBarGraph(prev => !prev)};

    const barGraph = ActivityBarGraph({tracker});
    const dotPlot = ActivityDotPlot({tracker});

    return <div>
        {userRoles.get(currentUser.identity!.username) === Role.Owner && (
            <div>
                <button onClick={switchGraph} style={{marginTop: '3px', marginLeft: '3px'}}>
                    {showBarGraph ? 'Switch to Dot Plot' : 'Switch to Bar Graph'}
                </button>
                {showBarGraph ? barGraph : dotPlot}
            </div>
        )}
    </div>

}