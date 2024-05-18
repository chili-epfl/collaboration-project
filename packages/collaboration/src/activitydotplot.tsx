import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

import * as React from 'react';
import Plot from 'react-plotly.js';

import { GraphProps } from './activitydisplay';
import { SimpleUser } from './cellTracker';

export const ActivityDotPlot: React.FC<GraphProps> = ({tracker}) => {

    const [state, setState] = React.useState<SimpleUser[][]>([]);

    const MIN_HORIZONTAL_RANGE = 20;

    React.useEffect(() => {

        const updateCounts = (notebook: Notebook) => {

            const counts = notebook.widgets.map(cell => {
                return cell.model.getMetadata('active_users') || [];
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

    const xValues: number[] = [];
    const yValues: number[] = [];
    const hoverText: string[] = [];

    state.forEach((userArray, cellIndex) => {

        userArray.forEach((user, userIndex) => {
            yValues.push(-cellIndex - 1);
            xValues.push(userIndex + 1);
            hoverText.push(`${user.name} on cell ${cellIndex + 1}`);
        });

    });

    const maxCellIndex = state.length > 0 ? state.length - 1 : 0
    const tickvals = Array.from(Array(maxCellIndex + 2).keys()).map(index => -index);
    const ticktext = Array.from(Array(maxCellIndex + 2).keys()).map(index => (index).toString());
    const maxXvalue = Math.max(...xValues, MIN_HORIZONTAL_RANGE);
    
    const data = [{
        y: yValues,
        x: xValues,
        type: 'scatter',
        mode: 'markers',
        orientation: 'h',
        marker: {color: 'green'},
        hoverinfo: 'text',
        text: hoverText
    }] as Plotly.Data[];

    const layout = {
        width: 300,
        height: 500,
        xaxis: {
            title: 'Active users',
            range: [0.5, maxXvalue]
        },
        yaxis: {
            title: 'Cell', 
            autorange: false,
            range: [-maxCellIndex - 1.5, -0.5],
            tickvals: tickvals,
            ticktext: ticktext
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