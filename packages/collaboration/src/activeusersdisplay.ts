import { Cell } from '@jupyterlab/cells'
import { Widget } from '@lumino/widgets';

class ActiveUsersDisplay extends Widget {

    constructor(cell: Cell) {
        super();

        this.addClass('jp-active-users-display');

        this.updateContent(cell);
    }

    updateContent(cell: Cell) {

        if (!cell) return;

        let activeUsers = cell.model.getMetadata('active_users');
        if (Number.isNaN(activeUsers) || !activeUsers) activeUsers = 0;

        this.node.textContent = `Active users: ${activeUsers}`;
    }

}

export function addDisplay(cell: Cell) {

    const display = cell.node.getElementsByClassName('jp-active-users-display')[0];
    const activeUsersDisplay = new ActiveUsersDisplay(cell);


    if (display) {

        display.replaceWith(activeUsersDisplay.node);

    } else {

        cell.node.appendChild(activeUsersDisplay.node);

    }

}