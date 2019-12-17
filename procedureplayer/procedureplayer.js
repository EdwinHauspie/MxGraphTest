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
    P.title = P.title || 'Untitled Procedure';
    P.nodes = P.nodes || [];
    //P.nodes = P.nodes.filter(x => !(x.style||'').includes('ellipse')); //Remove start/end nodes
    P.contents = P.contents || '';
    P.nodes.forEach(n => {
        n.contents = n.contents || '';
        n.title = (n.title || 'Untitled').trim();
        //n.edges = (n.edges || []).filter(e => P.nodes.find(n => n.id == e.target)); //Remove edges that don't point to any of the (cleaned up) nodes
        n.edges.forEach(e => {
            e.title = (e.title || 'Next').trim();
            e.contents = e.contents || '';
        });
        n.edges.sort(getSorter(e => e.title.toUpperCase()));
    });

    //Check for unique entry node
    let allEdges = P.nodes.reduce((agg, n) => agg.concat(n.edges), []);
    let targetIds = allEdges.map(e => e.target);
    let startNodes = P.nodes.filter(n => !targetIds.includes(n.id));
    if (startNodes.length !== 1) {
        Q('h1').innerHTML = 'Error: No single point of entry.';
        return CONTAINER;
    }
    let startNode = startNodes[0];

    //Check for (endless) loop
    let loop = null;

    (function walk(node, path) {
        path.push(node.id);
        if (loop || path.length > 500) return (loop = path); //If path gets unrealistically long, we assume there is a endless loop
        node.edges.map(e => P.nodes.find(n => n.id == e.target)).forEach(n => walk(n, path));
    })(startNode, []);

    if (loop) {
        var nodeIdCount = loop.reduce((agg, x) => { agg[x] = ((agg[x] || 0) + 1); return agg; }, {});
        var mostSeenNode = Object.keys(nodeIdCount).map(x => ({ id: x, count: nodeIdCount[x] })).sort(getSorter(x => x.count, true))[0];
        var node = P.nodes.find(x => x.id == mostSeenNode.id);
        Q('h1').innerHTML = `Error: Loop detected. (${node.title})`;
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
        Q('.edges').innerHTML = edgesHtml.join('') || '<div class="edge"><button data-restart>Restart Procedure</button></div>';
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