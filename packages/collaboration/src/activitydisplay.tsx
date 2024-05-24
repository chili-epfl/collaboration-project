import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { User } from '@jupyterlab/services';
import { JupyterFrontEnd } from '@jupyterlab/application';

import * as React from 'react';

import { ActivityBarGraph } from './activitybargraph';
import { ActivityDotPlot } from './activitydotplot';
import { Role, Roles } from './roles';
import { SidePanel } from '@jupyterlab/ui-components';

export interface ActivityDisplayComponentProps {

    tracker: INotebookTracker;
    currentUser: User.IManager;
    userRoles: Roles;
    app: JupyterFrontEnd;
    chatPanel: SidePanel;

}

export interface GraphProps {

    tracker: INotebookTracker

}

export class ActivityDisplay extends ReactWidget {

    private _tracker: INotebookTracker
    private _currentUser: User.IManager;
    private _roles: Roles;
    private _app: JupyterFrontEnd;
    private _chatPanel: SidePanel;

    constructor(tracker: INotebookTracker, currentUser: User.IManager, roles: Roles, app: JupyterFrontEnd, chatPanel: SidePanel) {

        super();

        this._tracker = tracker;
        this._currentUser = currentUser;
        this._roles = roles;
        this._app = app;
        this._chatPanel = chatPanel;

    }

    render() {
        return <ActivityDisplayComponent 
                    tracker={this._tracker} 
                    currentUser={this._currentUser} 
                    userRoles={this._roles} 
                    app={this._app}
                    chatPanel={this._chatPanel}
                />
    }

}

const ActivityDisplayComponent: React.FC<ActivityDisplayComponentProps> = ({tracker, currentUser, userRoles, app, chatPanel}) => {

    const [showBarGraph, setShowBarGraph] = React.useState(true);

    const switchGraph = () => {setShowBarGraph(prev => !prev)};

    const barGraph = ActivityBarGraph({tracker});
    const dotPlot = ActivityDotPlot({tracker, app, chatPanel});

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