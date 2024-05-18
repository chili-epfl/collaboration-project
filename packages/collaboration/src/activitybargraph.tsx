import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

import * as React from 'react';
import Plot from 'react-plotly.js';

import { GraphProps } from './activitydisplay';

export const ActivityBarGraph: React.FC<GraphProps> = ({tracker}) => {

    const [state, setState] = React.useState<number[]>([]);

    const MIN_HORIZONTAL_RANGE = 20;

    React.useEffect(() => {

        const updateCounts = (notebook: Notebook) => {

            const counts = notebook.widgets.map(cell => {
                let activeUsers = cell.model.getMetadata('active_users');
                if (!activeUsers || !Array.isArray(activeUsers)) return 0;
                return activeUsers.length;
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

    const maxXvalue = Math.max(Math.max(...state), MIN_HORIZONTAL_RANGE);
    
    const data = [{
        y: state.map((_, index) => index + 1),
        x: state,
        type: 'bar',
        orientation: 'h',
        marker: {color: 'green'},
        hovertemplate: '%{x} user(s) on cell %{y}<extra></extra>'
    }] as Plotly.Data[];

    const layout = {
        width: 300,
        height: 500,
        xaxis: {
            title: 'Active users',
            range: [0, maxXvalue]
        },
        yaxis: {
            title: 'Cell', 
            autorange: 'reversed' as const
        },
        margin: {
            l: 60,
            r: 30,
            t: 30,
            b: 60
        }
    };

    return <Plot className='jp-graph' data={data} layout={layout}/>

}