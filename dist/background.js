var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const storage = {
    get: (keys) => new Promise(resolve => {
        chrome.storage.local.get(keys, (res) => {
            resolve(res);
        });
    }),
    set: (storage) => new Promise(resolve => {
        chrome.storage.local.set(storage, () => {
            resolve();
        });
    }),
    remove: (keys) => new Promise(resolve => {
        chrome.storage.local.remove(keys, () => {
            resolve();
        });
    })
};
const closeTabs = (tabIds) => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
    chrome.tabs.remove(tabIds, () => {
        resolve();
    });
}));
const createTabs = (urls) => Promise.all(urls.map(url => new Promise(resolve => {
    chrome.tabs.create({ url }, () => {
        resolve();
    });
})));
const getCurrentTabs = () => new Promise(resolve => {
    chrome.tabs.query({ pinned: false, currentWindow: true }, tabs => {
        resolve(tabs);
    });
});
const switchWorkspace = (currentWorkspace, newName) => __awaiter(this, void 0, void 0, function* () {
    const currentTabs = yield getCurrentTabs();
    const { workspaces } = yield storage.get(['workspaces']);
    if (workspaces[newName]) {
        const newState = {
            currentWorkspace: newName,
            workspaces: Object.assign({}, workspaces, { [currentWorkspace]: currentTabs })
        };
        // Store tabs to current workspace + edit currentWorkspace
        yield storage.set(newState);
        // Delete current tabs
        yield closeTabs(currentTabs.map(tab => tab.id));
        // Create other tabs
        yield createTabs(workspaces[newName].map(tab => tab.url));
    }
});
const createWorkspace = () => __awaiter(this, void 0, void 0, function* () {
    const persistWorkspace = (name, workspaces) => __awaiter(this, void 0, void 0, function* () {
        const currentTabs = yield getCurrentTabs();
        return storage.set({ currentWorkspace: name, workspaces: Object.assign({}, workspaces, { [name]: currentTabs }) });
    });
    const name = prompt('Workspace name');
    if (name) {
        const { workspaces } = yield storage.get(['workspaces']);
        if (workspaces && workspaces[name]) {
            const override = confirm(`Workspace ${name} already exists. Do you want to override it ?`);
            override && (yield persistWorkspace(name, workspaces));
        }
        else {
            yield persistWorkspace(name, workspaces);
        }
    }
    loadWorkspaces();
});
const loadWorkspaces = () => __awaiter(this, void 0, void 0, function* () {
    const res = yield storage.get(['workspaces', 'currentWorkspace']);
    chrome.runtime.sendMessage(Object.assign({ type: 'loadedWorkspaces' }, res));
});
const deleteWorkspace = (name) => __awaiter(this, void 0, void 0, function* () {
    const { workspaces } = yield storage.get(['workspaces']);
    delete workspaces[name];
    yield storage.set({ workspaces });
    // chrome.runtime.sendMessage({ type: 'loadWorkspaces' });
    loadWorkspaces();
});
chrome.runtime.onMessage.addListener((message) => {
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
});
chrome.runtime.onInstalled.addListener(() => {
    storage.set({
        workspaces: {}
    });
});
chrome.commands.onCommand.addListener((command) => __awaiter(this, void 0, void 0, function* () {
    if (command === 'switch-workspace') {
        const { workspaces, currentWorkspace } = yield storage.get(['workspaces', 'currentWorkspace']);
        const availableWorkspaces = Object.keys(workspaces).filter(key => key !== currentWorkspace);
        if (availableWorkspaces.length === 0) {
            alert('Your current workspace is the only one you have. Unable to switch.');
        }
        else {
            const newWorkspaceIndex = prompt(`Which workspace do you want to switch to ? (Provide number)\n${availableWorkspaces
                .map((wp, idx) => `${idx}: ${wp}`)
                .join('\n')}`);
            if (newWorkspaceIndex && availableWorkspaces[newWorkspaceIndex]) {
                switchWorkspace(currentWorkspace, availableWorkspaces[newWorkspaceIndex]);
            }
        }
    }
}));
//# sourceMappingURL=background.js.map