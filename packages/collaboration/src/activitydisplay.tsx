import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker, Notebook, NotebookPanel } from '@jupyterlab/notebook';

export class ActivityDisplay extends ReactWidget {

    private _tracker: INotebookTracker

    constructor(tracker: INotebookTracker) {

        super();

        this._tracker = tracker;

    }

    render() {
        return <ActivityDisplayComponent tracker={this._tracker}/>
    }

}


interface ActivityDisplayComponentProps {

    tracker: INotebookTracker;

}

const ActivityDisplayComponent: React.FC<ActivityDisplayComponentProps> = ({tracker}) => {

    const [state, setState] = React.useState<number[]>([]);

    React.useEffect(() => {

        const updateCounts = (notebook: Notebook) => {

            const counts = notebook.widgets.map(cell => {
                return cell.model.getMetadata('active_users') || 0;
            });

            setState(counts);

        }

        const startTracking = (_: any, panel: NotebookPanel) => {

            const notebook = panel.content;

            notebook.model?.cells.changed.connect(() => {

                updateCounts(notebook);

                notebook.widgets.forEach(cell => {
                    cell.model.metadataChanged.connect(() => {
                        updateCounts(notebook);
                    })
                })

            })

        }

        tracker.widgetAdded.connect(startTracking);

        return () => {
            tracker.widgetAdded.disconnect(startTracking);
        }

    }, [tracker]);

    const graph = state.map((count, index) => (
        <div key={index} style={{height: '8px', width: count*5, backgroundColor: 'green', margin: '2px'}}/>
    ))

    return <div>{graph}</div>;

}