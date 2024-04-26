// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module collaboration-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { WebSocketAwarenessProvider } from '@jupyter/docprovider';
import { SidePanel, usersIcon, wordIcon } from '@jupyterlab/ui-components';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { IStateDB, StateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { Menu, MenuBar } from '@lumino/widgets';

import { IAwareness } from '@jupyter/ydoc';

import {
  addDisplay,
  Chatbox,
  CollaboratorsPanel,
  IGlobalAwareness,
  IUserMenu,
  PollList,
  remoteUserCursors,
  Roles,
  RendererUserMenu,
  stopTracking,
  trackActivity,
  UserInfoPanel,
  UserMenu
} from '@jupyter/collaboration';

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

let awarenessProvider: WebSocketAwarenessProvider;

/**
 * Jupyter plugin providing the IUserMenu.
 */
export const userMenuPlugin: JupyterFrontEndPlugin<IUserMenu> = {
  id: '@jupyter/collaboration-extension:userMenu',
  description: 'Provide connected user menu.',
  requires: [],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd): IUserMenu => {
    const { commands } = app;
    const { user } = app.serviceManager;
    return new UserMenu({ commands, user });
  }
};

/**
 * Jupyter plugin adding the IUserMenu to the menu bar if collaborative flag enabled.
 */
export const menuBarPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/collaboration-extension:user-menu-bar',
  description: 'Add user menu to the interface.',
  autoStart: true,
  requires: [IUserMenu, IToolbarWidgetRegistry],
  activate: async (
    app: JupyterFrontEnd,
    menu: IUserMenu,
    toolbarRegistry: IToolbarWidgetRegistry
  ): Promise<void> => {
    const { user } = app.serviceManager;

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    user.userChanged.connect(() => menuBar.update());
    menuBar.addMenu(menu as Menu);

    toolbarRegistry.addFactory('TopBar', 'user-menu', () => menuBar);
  }
};

/**
 * Jupyter plugin creating a global awareness for RTC.
 */
export const rtcGlobalAwarenessPlugin: JupyterFrontEndPlugin<IAwareness> = {
  id: '@jupyter/collaboration-extension:rtcGlobalAwareness',
  description: 'Add global awareness to share working document of users.',
  requires: [IStateDB],
  provides: IGlobalAwareness,
  activate: (app: JupyterFrontEnd, state: StateDB): IAwareness => {
    const { user } = app.serviceManager;

    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);

    const server = ServerConnection.makeSettings();
    const url = URLExt.join(server.wsUrl, 'api/collaboration/room');

    awarenessProvider = new WebSocketAwarenessProvider({
      url: url,
      roomID: 'JupyterLab:globalAwareness',
      awareness: awareness,
      user: user
    });

    state.changed.connect(async () => {
      const data: any = await state.toJSON();
      const current = data['layout-restorer:data']?.main?.current || '';

      if (current.startsWith('editor') || current.startsWith('notebook')) {
        awareness.setLocalStateField('current', current);
      } else {
        awareness.setLocalStateField('current', null);
      }
    });

    return awareness;
  }
};

/**
 * Jupyter plugin adding the RTC information to the application left panel if collaborative flag enabled.
 */
export const rtcPanelPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/collaboration-extension:rtcPanel',
  description: 'Add side panel to display all currently connected users.',
  autoStart: true,
  requires: [IGlobalAwareness],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    awareness: Awareness,
    translator: ITranslator | null
  ): void => {

    const { user } = app.serviceManager;

    const trans = (translator ?? nullTranslator).load('jupyter_collaboration');

    const userPanel = new SidePanel({
      alignment: 'justify'
    });
    userPanel.id = 'jp-collaboration-panel';
    userPanel.title.icon = usersIcon;
    userPanel.title.caption = trans.__('Collaboration');
    userPanel.addClass('jp-RTCPanel');
    app.shell.add(userPanel, 'left', { rank: 300 });

    const roles = new Roles(user, awareness, awarenessProvider);

    const currentUserPanel = new UserInfoPanel(user, roles);
    currentUserPanel.title.label = trans.__('User info');
    currentUserPanel.title.caption = trans.__('User information');
    userPanel.addWidget(currentUserPanel);

    const fileopener = (path: string) => {
      void app.commands.execute('docmanager:open', { path });
    };

    const collaboratorsPanel = new CollaboratorsPanel(
      user,
      awareness,
      fileopener,
      roles
    );
    collaboratorsPanel.title.label = trans.__('Online Collaborators');
    userPanel.addWidget(collaboratorsPanel);


    const chatPanel = new SidePanel({
      alignment: 'justify'
    });
    chatPanel.id = 'jp-chat-panel';
    chatPanel.title.icon = wordIcon;
    chatPanel.title.caption = trans.__('Chat');
    chatPanel.addClass('jp-RTCPanel');
    app.shell.add(chatPanel, 'left', { rank: 301 });

    const chatbox = new Chatbox(user, awarenessProvider, roles);

    chatbox.title.label = trans.__('Chat with collaborators');
    chatPanel.addWidget(chatbox);

    const pollTab = new PollList(user, awarenessProvider, roles);

    pollTab.title.label = trans.__('Polls');
    chatPanel.addWidget(pollTab);
  }
};

export const userEditorCursors: JupyterFrontEndPlugin<void> = {
  id: '@jupyter/collaboration-extension:userEditorCursors',
  description:
    'Add CodeMirror extension to display remote user cursors and selections.',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  activate: (
    app: JupyterFrontEnd,
    extensions: IEditorExtensionRegistry
  ): void => {
    extensions.addExtension({
      name: 'remote-user-cursors',
      factory(options) {
        const { awareness, ysource: ytext } = options.model.sharedModel as any;
        return EditorExtensionRegistry.createImmutableExtension(
          remoteUserCursors({ awareness, ytext })
        );
      }
    });
  }
};

export const cellTracker: JupyterFrontEndPlugin<void> = {

  id: '@jupyter/collaboration-extension:cellTracker',
  description:
    'Add a way to keep track of the cell each user is currently on',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker
  ): void => {

    let previousPanel: NotebookPanel | null = null;

    tracker.currentChanged.connect(() => {
      if (tracker.currentWidget) {
        tracker.currentWidget.revealed.then(() => trackActivity(tracker.currentWidget!));

        stopTracking(previousPanel);

        previousPanel = tracker.currentWidget;
      }
    })

  }

}

export const activeUsersDisplay: JupyterFrontEndPlugin<void> = {

  id: '@jupyter/collaboration-extension:activeUsersDisplay',
  description:
    'Display how many users are working on each cell',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker
  ): void => {

    tracker.widgetAdded.connect((sender, notebookPanel) => {
      const notebook = notebookPanel.content;

      notebook.model?.cells.changed.connect(() => {

        notebook.widgets.forEach(cell => {
          addDisplay(cell);

          cell.model.metadataChanged.connect(() => {
            addDisplay(cell);
          })
        });

      });

      notebook.widgets.forEach(cell => addDisplay(cell));

    });
  }
}