import { NotebookPanel, Notebook } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { User } from '@jupyterlab/services';


let prevCell: Cell | null = null;
let disconnected = false;
let notebook: Notebook;
let undefinedStuff = 0;
let currentUser: SimpleUser;

export interface SimpleUser {

    id: string,
    name: string

}


export function trackActivity(nb: NotebookPanel, user: User.IManager) {

    currentUser = { id: user.identity!.username, name: user.identity!.name }

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
        if (prevCell) {

            if (prevCell.model.id === undefined && undefinedStuff === 0) undefinedStuff = 1;
            
            removeActivity(prevCell);

        }

        // When entering a new cell, add activity to its metadata
        if (cell) addActivity(cell);

        prevCell = cell;

    }

}

// Increment a cell's active users count
function addActivity(cell: Cell) {

    if (cell.model.id === undefined) return;

    // Fix for inconsistent tracking when swapping cells or changing their type
    if (undefinedStuff === 1) undefinedStuff = 2;
    else if (undefinedStuff === 2) {
        undefinedStuff = 0;
        return;
    }

    let activeUsersArray = cell.model.getMetadata('active_users') || [];
    activeUsersArray.push(currentUser);
    cell.model.setMetadata('active_users', activeUsersArray);       
}

// Decrement a cell's active users count
function removeActivity(cell: Cell) {
        
    if (cell.model === null) return;

    let activeUsersArray = cell.model.getMetadata('active_users') || [];
    activeUsersArray = activeUsersArray.filter((user: SimpleUser) => user.id !== currentUser.id)
    cell.model.setMetadata('active_users', activeUsersArray);
}