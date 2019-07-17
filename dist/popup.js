(function () {
    const workspacesDiv = document.getElementById('workspaces');
    const currentWorkspaceDiv = document.getElementById('currentWorkspace');
    const displayWorkspaceLine = (currentWorkspace, name, numberOfTabs, line) => {
        const onClick = () => {
            chrome.runtime.sendMessage({
                type: 'switchWorkspace',
                currentWorkspace: currentWorkspace,
                newName: name
            });
        };
        const workspaceBadge = document.createElement('div');
        workspaceBadge.className = 'workspace_tabs';
        workspaceBadge.innerText = `${numberOfTabs}`;
        workspaceBadge.style.gridColumn = '1/2';
        workspaceBadge.style.gridRow = `${line} / ${line + 1}`;
        const workspaceDiv = document.createElement('div');
        workspaceDiv.className = 'workspace';
        workspaceDiv.innerText = name;
        workspaceDiv.style.gridColumn = '2/3';
        workspaceDiv.style.gridRow = `${line} / ${line + 1}`;
        const workspaceRmLink = document.createElement('div');
        workspaceRmLink.className = 'rm_link';
        workspaceRmLink.innerHTML = '<img style="display: block; opacity: 0.5;" height="20px" src="img/bin.png"/>';
        workspaceRmLink.onclick = () => {
            chrome.runtime.sendMessage({ type: 'deleteWorkspace', name });
        };
        workspaceRmLink.style.gridColumn = '3/4';
        workspaceRmLink.style.gridRow = `${line} / ${line + 1}`;
        const workspaceBackground = document.createElement('div');
        workspaceBackground.className = 'workspaceBackground';
        workspaceBackground.style.gridColumn = '1/3';
        workspaceBackground.style.gridRow = `${line} / ${line + 1}`;
        workspaceBackground.onclick = onClick;
        workspacesDiv.append(workspaceBadge, workspaceDiv, workspaceRmLink, workspaceBackground);
    };
    const workspacesLoaded = (res) => {
        workspacesDiv.innerHTML = '';
        currentWorkspaceDiv.innerHTML = '';
        console.log({ res });
        if (res.currentWorkspace) {
            currentWorkspaceDiv.innerText = res.currentWorkspace;
        }
        else {
            currentWorkspaceDiv.innerText = 'No workspaces selected yet !';
        }
        const workspacesNames = Object.keys(res.workspaces);
        if (workspacesNames.length <= 1) {
            const text = ['No workspaces yet !', 'No more workspaces.'];
            const noWorkspacesDiv = document.createElement('div');
            noWorkspacesDiv.style.gridColumn = '1/4';
            noWorkspacesDiv.innerText = text[workspacesNames.length];
            workspacesDiv.append(noWorkspacesDiv);
        }
        else {
            let row = 1;
            workspacesNames.forEach(key => {
                if (key !== res.currentWorkspace) {
                    displayWorkspaceLine(res.currentWorkspace, key, res.workspaces[key].length, row);
                    row++;
                }
            });
        }
    };
    chrome.runtime.sendMessage({ type: 'loadWorkspaces' });
    const createWorkspace = document.getElementById('createBtn');
    createWorkspace.onclick = () => {
        chrome.runtime.sendMessage({ type: 'createWorkspace' });
    };
    const createEmptyWorkspace = document.getElementById('createEmptyBtn');
    createEmptyWorkspace.onclick = () => {
        chrome.runtime.sendMessage({ type: 'createWorkspace', empty: true });
    };
    chrome.runtime.onMessage.addListener(message => {
        switch (message.type) {
            case 'close':
                window.close();
                break;
            case 'loadedWorkspaces':
                workspacesLoaded({ workspaces: message.workspaces, currentWorkspace: message.currentWorkspace });
                break;
        }
    });
})();
//# sourceMappingURL=popup.js.map