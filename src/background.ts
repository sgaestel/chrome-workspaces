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
  get: (keys: string[]): Promise<Storage> =>
    new Promise(resolve => {
      chrome.storage.local.get(keys, (res: Storage) => {
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

  console.log({ currentWorkspace, newName, workspaces });

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
    console.log(message);
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

export {};
