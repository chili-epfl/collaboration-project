//import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
//import { ILabShell } from '@jupyterlab/application';

export function trackActivity(nb: NotebookPanel) {

    let prevCell: Cell | null = null

    const notebook = nb.content;

    notebook.activeCellChanged.connect(() => {

        const cell = notebook.activeCell;

        // When entering a new cell, remove activity from previous cell's metadata
        if (prevCell) {

            let activeUsers = prevCell.model.getMetadata('active_users');
            activeUsers--;
            prevCell.model.setMetadata('active_users', activeUsers);

        }

        // When entering a new cell, add activity to its metadata
        if (cell) {

            let activeUsers = cell.model.getMetadata('active_users');
            if (Number.isNaN(activeUsers)) activeUsers = 0;
            activeUsers++;
            cell.model.setMetadata('active_users', activeUsers);

            activeUsers = cell.model.getMetadata('active_users');

            console.log('This cell has', activeUsers.toString(), 'active users');

        }

        prevCell = cell;

    });

}