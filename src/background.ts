interface Workspaces {
  [key: string]: chrome.tabs.Tab[];
}

interface Storage {
  workspaces?: Workspaces;
  currentWorkspace?: string;
}

interface StorageResponse {
  workspaces: Workspaces;
  currentWorkspace: string;
}

const storage = {
  get: (keys: string[]): Promise<StorageResponse> =>
    new Promise(resolve => {
      chrome.storage.local.get(keys, (res: StorageResponse) => {
        resolve(res);
      });
    }),
  set: (storage: Storage): Promise<void> =>
    new Promise(resolve => {
      chrome.storage.local.set(storage, () => {
        resolve();
      });
    }),
  remove: (keys: string | string[]): Promise<void> =>
    new Promise(resolve => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    })
};

const closeTabs = (tabIds: number[]): Promise<void> =>
  new Promise(async resolve => {
    chrome.tabs.remove(tabIds, () => {
      resolve();
    });
  });

const createTabs = (urls: (string | undefined)[]): Promise<void[]> =>
  Promise.all(
    urls.map(
      url =>
        new Promise(resolve => {
          chrome.tabs.create({ url }, () => {
            resolve();
          });
        })
    )
  );

const getCurrentTabs = (): Promise<chrome.tabs.Tab[]> =>
  new Promise(resolve => {
    chrome.tabs.query({ pinned: false, currentWindow: true }, tabs => {
      resolve(tabs);
    });
  });

const switchWorkspace = async (currentWorkspace: string, newName: string) => {
  const currentTabs = await getCurrentTabs();
  const { workspaces } = <{ workspaces: Workspaces }>await storage.get(['workspaces']);

  if (workspaces[newName]) {
    const newState: Storage = {
      currentWorkspace: newName,
      workspaces: <Workspaces>{
        ...workspaces,
        [currentWorkspace]: currentTabs
      }
    };

    // Store tabs to current workspace + edit currentWorkspace
    await storage.set(newState);
    // Delete current tabs
    await closeTabs(currentTabs.map(tab => <number>tab.id));
    // Create other tabs
    await createTabs(workspaces[newName].map(tab => tab.url));
  }
};

const createWorkspace = async (): Promise<void> => {
  const persistWorkspace = async (name: string, workspaces): Promise<void> => {
    const currentTabs = await getCurrentTabs();
    return storage.set({ currentWorkspace: name, workspaces: { ...workspaces, [name]: currentTabs } });
  };

  const name = prompt('Workspace name');
  if (name) {
    const { workspaces } = <{ workspaces: Workspaces }>await storage.get(['workspaces']);
    if (workspaces && workspaces[name]) {
      const override = confirm(`Workspace ${name} already exists. Do you want to override it ?`);
      override && (await persistWorkspace(name, workspaces));
    } else {
      await persistWorkspace(name, workspaces);
    }
  }
  loadWorkspaces();
};

const loadWorkspaces = async (): Promise<void> => {
  const res = <StorageResponse>await storage.get(['workspaces', 'currentWorkspace']);
  chrome.runtime.sendMessage({ type: 'loadedWorkspaces', ...res });
};

const deleteWorkspace = async (name: string) => {
  const { workspaces } = <{ workspaces: Workspaces }>await storage.get(['workspaces']);
  delete workspaces[name];
  await storage.set({ workspaces });
  // chrome.runtime.sendMessage({ type: 'loadWorkspaces' });
  loadWorkspaces();
};

chrome.runtime.onMessage.addListener(
  (message): void | boolean => {
    switch (message.type) {
      case 'switchWorkspace':
        switchWorkspace(message.currentWorkspace, message.newName);
        break;
      case 'createWorkspace':
        createWorkspace();
        break;
      case 'loadWorkspaces':
        loadWorkspaces();
        break;
      case 'deleteWorkspace':
        deleteWorkspace(message.name);
      default:
    }
  }
);

chrome.runtime.onInstalled.addListener(() => {
  storage.set({
    workspaces: {}
  });
});

chrome.commands.onCommand.addListener(async command => {
  if (command === 'switch-workspace') {
    const { workspaces, currentWorkspace } = await storage.get(['workspaces', 'currentWorkspace']);
    const availableWorkspaces = Object.keys(workspaces).filter(key => key !== currentWorkspace);
    if (availableWorkspaces.length === 0) {
      alert('Your current workspace is the only one you have. Unable to switch.');
    } else {
      const newWorkspaceIndex = prompt(
        `Which workspace do you want to switch to ? (Provide number)\n${availableWorkspaces
          .map((wp, idx) => `${idx}: ${wp}`)
          .join('\n')}`
      );
      if (newWorkspaceIndex && availableWorkspaces[newWorkspaceIndex]) {
        switchWorkspace(currentWorkspace, availableWorkspaces[newWorkspaceIndex]);
      }
    }
  }
});

export {};
