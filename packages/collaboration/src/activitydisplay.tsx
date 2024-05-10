import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker, Notebook, NotebookPanel } from '@jupyterlab/notebook';
import Plot from 'react-plotly.js';

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
    
    const data = [{
        y: state.map((_, index) => index + 1),
        x: state,
        type: 'bar',
        orientation: 'h',
        marker: {color: 'green'}
    }] as Plotly.Data[];

    const layout = {
        width: 300,
        height: 500,
        xaxis: {title: 'Active users'},
        yaxis: {title: 'Cell', autorange: 'reversed' as const}
    };

    return <Plot className='jp-graph' data={data} layout={layout}/>

}