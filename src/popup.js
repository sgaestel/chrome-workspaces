const workspaceDiv = document.getElementById('workspaces');

const loadWorkspaces = () => {
  chrome.storage.local.get(['workspaces', 'currentWorkspace'], ({ workspaces, currentWorkspace }) => {
    workspaceDiv.innerHTML = '';
    if (workspaces) {
      workspaceDiv.append(
        ...workspaces.map(workspaceName => {
          const div = document.createElement('div');
          const wp = document.createElement('a');
          wp.className = 'workspace';
          wp.href = '#';
          wp.innerText = workspaceName;
          wp.onclick = () => {
            chrome.tabs.query({ pinned: false, currentWindow: true }, tabs => {
              chrome.storage.local.set({
                [currentWorkspace]: tabs.map(tab => ({ title: tab.title, url: tab.url })),
                currentWorkspace: workspaceName
              });
              chrome.tabs.remove(tabs.map(tab => tab.id));
            });
            chrome.storage.local.get([workspaceName], ({ [workspaceName]: workspace }) => {
              workspace.forEach(tab => {
                chrome.tabs.create({ url: tab.url }, createdTab => {
                  chrome.tabs.discard(createdTab.id);
                });
              });
            });
          };
          const rm = document.createElement('a');
          rm.href = '#';
          rm.innerText = 'Del';
          rm.onclick = () => {
            const remove = confirm(`Are you sure you want to delete workspace ${workspaceName} ?`);
            if (remove) {
              const idx = workspaces.indexOf(workspaceName);
              workspaces.splice(idx, 1);
              chrome.storage.local.set({ workspaces });
              chrome.storage.local.remove(workspaceName);
              loadWorkspaces();
            }
          };
          div.append(wp);
          div.append(rm);
          return div;
        })
      );
    }
  });
};

loadWorkspaces();

const createWorkspace = document.getElementById('createWorkspace');
createWorkspace.onclick = () => {
  const name = prompt('Workspace name');
  if (name) {
    chrome.tabs.query({ pinned: false, currentWindow: true }, tabs => {
      chrome.storage.local.get(['workspaces', name], res => {
        if (res[name]) {
          alert(`Workspace '${name}' already exists`);
        } else {
          chrome.storage.local.set({
            [name]: tabs.map(tab => ({ title: tab.title, url: tab.url })),
            workspaces: [...(res.workspaces || []), name],
            currentWorkspace: name
          });
          loadWorkspaces();
        }
      });
    });
  }
};
