import { NotebookPanel, Notebook } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';

let prevCell: Cell | null = null;
let disconnected = false;
let notebook: Notebook;


export function trackActivity(nb: NotebookPanel) {

    notebook = nb.content;

    notebook.activeCellChanged.connect(onCellChanged);

    // When closing the window, remove activity from last cell's metadata
    window.addEventListener('beforeunload', () => {
        if (prevCell && !disconnected) {
    
            removeActivity(prevCell);
            disconnected = true;
    
        }
    })

}

export function stopTracking(nb: NotebookPanel | null) {

    if (nb) {

        nb.content.activeCellChanged.disconnect(onCellChanged);

    }

}

function onCellChanged() {

    {

        const cell = notebook.activeCell;

        // When entering a new cell, remove activity from previous cell's metadata
        if (prevCell) removeActivity(prevCell);

        // When entering a new cell, add activity to its metadata
        if (cell) addActivity(cell);

        prevCell = cell;

    }

}

// Increment a cell's active users count
function addActivity(cell: Cell) {

    let activeUsers = cell.model.getMetadata('active_users');
    if (Number.isNaN(activeUsers)) activeUsers = 0;
    activeUsers++;
    cell.model.setMetadata('active_users', activeUsers);
        
}

// Decrement a cell's active users count
function removeActivity(cell: Cell) {
        
    if (cell.model === null) return;

    let activeUsers = cell.model.getMetadata('active_users');
    activeUsers--;
    if (activeUsers < 0) activeUsers = 0;
    cell.model.setMetadata('active_users', activeUsers);

}