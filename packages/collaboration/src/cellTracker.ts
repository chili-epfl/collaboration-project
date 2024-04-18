import { INotebookTracker } from '@jupyterlab/notebook'


export class CellTracker {

    private _tracker: INotebookTracker;

    constructor(tracker: INotebookTracker) {
        this._tracker = tracker;

        this._tracker.activeCellChanged.connect(this.onCellChanged, this);
    }

    private onCellChanged(): void {

        const widget = this._tracker.currentWidget;

        const cellIndex = widget?.content.activeCellIndex;

        if (cellIndex !== undefined) {

            console.log(`New cell: widget ${widget}, cell ${cellIndex}`);

        }


    }

}