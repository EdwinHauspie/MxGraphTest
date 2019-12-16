function createProcedurePlayer(P, layout) {

    //Create defaults and clean up
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
    });

    //Create layout/container
    let layoutCreator = document.createElement('div');
    layoutCreator.innerHTML = layout;
    const CONTAINER = layoutCreator.firstChild;

    function Q(selector) {
        return CONTAINER.querySelector(selector);
    }

    function getValidEdges(nodeId) { //Filter edges pointing to valid nodes
        var node = P.nodes.find(x => x.id == nodeId);
        if (!node) return [];
        return node.edges.filter(e => P.nodes.find(n => n.id == e.target)).sort((a, b) => {
            var nameA = a.title.toUpperCase(); // ignore upper and lowercase
            var nameB = b.title.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }

    function getEdge(sourceId, targetId) {
        return getValidEdges(sourceId).find(e => e.target == targetId);
    }

    //Determine the first real node to display
    let allEdges = P.nodes.reduce((agg, n) => agg.concat(getValidEdges(n.id)), []);
    let targetIds = allEdges.map(e => e.target);
    let startNodes = P.nodes.filter(n => !targetIds.includes(n.id));
    if (startNodes.length !== 1) {
        Q('h1').innerHTML = 'Error: Could not find single point of entry';
        return CONTAINER;
    }
    let startNode = startNodes[0];

    //Check for endless loops
    var paths = [];
    function walk(node) {

    }
    walk(startNode);

    if (false) {
        Q('h1').innerHTML = 'Error: Endless loop detected';
        return CONTAINER;
    }

    let breadCrumb = [],
        bcPointer = -1;

    Q('h1').innerHTML = P.title;
    Q('.intro').innerHTML = P.contents + `<br><br><button data-target="${startNode.id}" onclick="this.parentNode.removeChild(this)">Procedure Starten</button>`;

    function showNode(nodeId) {
        CONTAINER.querySelector('.play').style = 'display:block;';

        let node = P.nodes.find(x => x.id == nodeId);
        Q('.node').innerHTML = `<h3>${node.title}</h3> ${node.contents}`;

        let edges = getValidEdges(nodeId);
        let edgesHtml = edges.map(e => `<div class="edge"><button data-target="${e.target}">${e.title}</button><div>${e.contents}</div></div>`);
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