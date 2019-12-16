function createProcedurePlayer(P, layout) {

    //Clean up the procedure and create defaults
    P.title = P.title || 'Untitled procedure';
    P.nodes = P.nodes || [];
    P.nodes = P.nodes.filter(x => !x.style); //Nodes with a style are start or end nodes
    P.contents = P.contents || '';
    P.nodes.forEach(n => {
        n.edges = n.edges || [];
        n.contents = n.contents || '';

        n.edges.forEach(e => {
            e.title = e.title || 'Volgende';
            e.contents = e.contents || '';
        });

        n.edges = n.edges.sort((a, b) => {
            var nameA = a.title.toUpperCase(); //Ignore upper and lowercase
            var nameB = b.title.toUpperCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        //Remove edges that don't point to any of the (cleaned up) nodes
        n.edges = n.edges.filter(e => P.nodes.find(n => n.id == e.target));
    });

    //Create layout/container
    let layoutCreator = document.createElement('div');
    layoutCreator.innerHTML = layout;
    const CONTAINER = layoutCreator.firstChild;

    function Q(selector) {
        return CONTAINER.querySelector(selector);
    }

    function getEdge(sourceId, targetId) {
        var node = P.nodes.find(x => x.id == sourceId);
        return node.edges.find(e => e.target == targetId);
    }

    //Check for unique entry node
    let allEdges = P.nodes.reduce((agg, n) => agg.concat(n.edges), []);
    let targetIds = allEdges.map(e => e.target);
    let startNodes = P.nodes.filter(n => !targetIds.includes(n.id));
    if (startNodes.length !== 1) {
        Q('h1').innerHTML = 'Error: No find single point of entry';
        return CONTAINER;
    }
    let startNode = startNodes[0];

    //Check for endless loops
    let loop = false;

    (function walk(node, path) {
        path.push(node.id);
        if (path.length > 1000) return (loop = true); //If path gets too long, we assume there is a endless loop
        node.edges.map(e => P.nodes.find(n => n.id == e.target)).forEach(n => walk(n, path));
    })(startNode, []);

    if (loop) {
        Q('h1').innerHTML = 'Error: Endless loop detected';
        return CONTAINER;
    }

    //Everything is OK, start showing the procedure
    let breadCrumb = [],
        bcPointer = -1;

    Q('h1').innerHTML = P.title;
    Q('.intro').innerHTML = P.contents + `<br><br><button data-target="${startNode.id}" onclick="this.parentNode.removeChild(this)">Procedure Starten</button>`;

    function showNode(nodeId) {
        CONTAINER.querySelector('.play').style = 'display:block;';

        let node = P.nodes.find(x => x.id == nodeId);
        Q('.node').innerHTML = `<h3>${node.title}</h3> ${node.contents}`;

        let edgesHtml = node.edges.map(e => `<div class="edge"><button data-target="${e.target}">${e.title}</button><div>${e.contents}</div></div>`);
        Q('.edges').innerHTML = edgesHtml.join('') || '<b>Einde</b>';
    }

    function renderBreadCrumb() {
        let crumbHtml = breadCrumb.map(function (id, i) {
            var node = P.nodes.find(x => x.id == id);
            var nodeHtml = `<a href="javascript:void(0);" data-crumb="${i}">${node.title}</a>`;
            var edgeHtml = '';
            if (breadCrumb[i + 1]) {
                edgeHtml = `<b>${getEdge(id, breadCrumb[i + 1]).title}</b>`;
            }
            return `<div ${i > bcPointer ? 'style="opacity:.3"' : ''}">${nodeHtml} ${edgeHtml}</div>`;
        });

        Q('.breadcrumb').innerHTML = crumbHtml.join('');
    }

    function gotoNode(nodeId) {
        if (bcPointer < breadCrumb.length - 1) //When the breadcrumb pointer is not pointing to the last item
            breadCrumb = breadCrumb.slice(0, bcPointer + 1);

        breadCrumb.push(nodeId);
        bcPointer = breadCrumb.length - 1;

        showNode(nodeId);
        renderBreadCrumb();
    }

    function gotoCrumb(index) {
        var nodeId = breadCrumb[index];
        showNode(nodeId);
        bcPointer = index;
        renderBreadCrumb();
    }

    CONTAINER.onclick = e => {
        let nodeId = e.target.getAttribute('data-target');
        let crumb = e.target.getAttribute('data-crumb');

        if (nodeId) {
            gotoNode(nodeId);
            return false;
        } else if (crumb) {
            gotoCrumb(parseInt(crumb, 10));
            return false;
        }

        return true;
    };

    return CONTAINER;
}