function createProcedurePlayer(P, layout) {

    //Create layout/container
    let layoutCreator = document.createElement('div');
    layoutCreator.innerHTML = layout;
    const CONTAINER = layoutCreator.firstChild;

    //Helper functions
    function Q(selector) {
        return CONTAINER.querySelector(selector);
    }

    function getSorter(valueSelectorFunc, descending) {
        let sortModifier = descending ? -1 : 1;

        return (a, b) => {
            let aVal = valueSelectorFunc(a), bVal = valueSelectorFunc(b);
            if (aVal > bVal) return 1 * sortModifier;
            if (aVal < bVal) return -1 * sortModifier;
            return 0;
        }
    }

    //Clean up the procedure and create defaults
    P.title = P.title || 'New procedure';
    P.nodes = P.nodes || [];
    P.contents = P.contents || '';
    P.nodes.forEach(n => {
        n.contents = n.contents || '';
        n.title = (n.title || 'Untitled').trim();
        n.edges = n.edges || [];
        n.edges.forEach(e => {
            e.title = (e.title || 'Next').trim();
            e.contents = e.contents || '';
        });
        n.edges.sort(getSorter(e => e.title.toUpperCase()));
    });

    //Check for start node
    let startNode = null;
    let startNodes = P.nodes.filter(n => n.start);

    if (startNodes.length === 1) startNode = startNodes[0];
    else {
        let allTargetedNodeIds = P.nodes.map(x => x.edges).reduce((agg, x) => agg.concat(x), []).map(x => x.target);
        let allNonTargetedNodes = P.nodes.filter(x => !allTargetedNodeIds.includes(x.id));
        if (allNonTargetedNodes.length === 1) startNode = allNonTargetedNodes[0];
    }

    if (!startNode) {
        Q('h1').innerHTML = 'Error: Could not find start of procedure';
        return CONTAINER;
    }

    //Loop detection - Every node must be able to get to an end node, meaning loops are valid as long as there is a way out
    let endNodes = P.nodes.filter(x => !x.edges || x.edges.length === 0);
    let notEndNodes = P.nodes.filter(x => x.edges && x.edges.length);

    function canReachEndNode(node) {
        let endReached = false;

        function walk(n, path) {
            if (path.includes(n.id)) return;
            path.push(n.id);
            let targetNodes = n.edges.map(e => P.nodes.find(n => n.id == e.target));
            let goesToEndNode = !!targetNodes.find(x => endNodes.includes(x));
            if (goesToEndNode) return (endReached = true);
            targetNodes.forEach(x => walk(x, path));
        }

        walk(node, []);
        return endReached;
    }

    let problem = notEndNodes.find(x => !canReachEndNode(x));

    if (problem) {
        Q('h1').innerHTML = `Error: Loop or invalid path (${problem.title})`;
        return CONTAINER;
    }

    //Show intro
    Q('h1').innerHTML = P.title;
    Q('.intro').innerHTML = P.contents;
    Q('.edges').innerHTML = `<div class="edge"><button data-start>Start Procedure</button></div>`;
    Q('.breadcrumb').style.display = 'none';

    let breadCrumb = [],
        bcPointer = -1;

    //Rendering methods
    function renderNodeContents(nodeId) {
        let node = P.nodes.find(x => x.id == nodeId);
        Q('.node').innerHTML = `<h3>${node.title}</h3> ${node.contents}`;

        let edgesHtml = node.edges.map(e => `<div class="edge"><button data-target="${e.target}">${e.title}</button><div>${e.contents}</div></div>`);
        Q('.edges').innerHTML = edgesHtml.join('') || '<div class="edge" style="text-align: right;display: block;"><button data-restart>Restart Procedure</button></div>';
    }

    function getConnectingEdge(sourceId, targetId) {
        var node = P.nodes.find(x => x.id == sourceId);
        return node.edges.find(e => e.target == targetId);
    }

    function renderBreadCrumb() {
        let crumbHtml = breadCrumb.map(function (id, i) {
            var node = P.nodes.find(x => x.id == id);
            var nodeHtml = `<a href="javascript:void(0);" data-crumb="${i}">${node.title}</a>`;
            if (breadCrumb[i + 1]) nodeHtml += ` ${getConnectingEdge(id, breadCrumb[i + 1]).title}`;
            return `<div ${i > bcPointer ? 'style="opacity:.3"' : ''}">${nodeHtml}</div>`;
        });

        Q('.breadcrumb').style.display = 'block';
        Q('.breadcrumb').innerHTML = crumbHtml.join('');
    }

    //Navigation methods
    function gotoNode(nodeId) {
        if (bcPointer < breadCrumb.length - 1) //When the breadcrumb pointer is not pointing to the last item
            breadCrumb = breadCrumb.slice(0, bcPointer + 1);

        breadCrumb.push(nodeId);
        bcPointer = breadCrumb.length - 1;

        renderNodeContents(nodeId);
        renderBreadCrumb();
    }

    function gotoCrumb(index) {
        var nodeId = breadCrumb[index];
        renderNodeContents(nodeId);
        bcPointer = index;
        renderBreadCrumb();
    }

    //Click handler
    CONTAINER.onclick = e => {
        let nodeId = e.target.getAttribute('data-target');
        let crumb = e.target.getAttribute('data-crumb');

        if (nodeId) {
            gotoNode(nodeId);
            return false;
        } else if (crumb) {
            gotoCrumb(parseInt(crumb, 10));
            return false;
        } else if (e.target.getAttribute('data-start') === '') {
            gotoNode(startNode.id);
            e.target.parentNode.removeChild(e.target);
            return false;
        } else if (e.target.getAttribute('data-restart') === '') {
            breadCrumb = [];
            bcPointer = -1;
            gotoNode(startNode.id);
            return false;
        }

        return true;
    };

    return CONTAINER;
}