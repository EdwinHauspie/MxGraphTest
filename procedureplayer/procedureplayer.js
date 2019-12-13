function createProcedurePlayer(P, layout) {

    function arrayToHtml(arr, func) {
        return (arr || []).reduce((agg, x) => (agg += func(x)), '');
    }

    //let breadCrumb = [];
    const CONTAINER = document.createElement('div');
    CONTAINER.innerHTML = layout;

    function setHtml(sel, html) {
        CONTAINER.querySelector(sel).innerHTML = html;
    }

    //Determine the first real node to display
    let eligibleNodes = P.nodes.filter(x => !x.style); //Filter start/end nodes
    let allEdges = eligibleNodes.reduce((agg, n) => agg.concat(n.edges || []), []);
    let targetIds = allEdges.map(e => e.target);
    let startNode = eligibleNodes.filter(n => !targetIds.includes(n.id));
    if (startNode.length !== 1) {
        setHtml('.title', 'Entrypoint error');
        return CONTAINER;
    }
    else startNode = startNode[0];

    setHtml('.title', P.title);
    setHtml('.contents', P.contents);
    setHtml('.edges', `<div class="edge"><button data-target="${startNode.id}">Start</button></div>`);

    function navigateToNode(id) {
        let node = P.nodes.find(x => x.id == id);
        //breadCrumb.push(node.id);

        let eligibleEdges = node.edges.filter(e => eligibleNodes.find(n => n.id == e.target)); //Don't keep edges pointing to end nodes
        let edgesHtml = arrayToHtml(eligibleEdges, e => `<div class="edge"><button data-target="${e.target}">${e.title || 'Volgende'}</button><div>${e.contents || ''}</div></div>`);
        setHtml('.contents', `<h3>${node.title}</h3>${node.contents || ''}`);
        setHtml('.edges', edgesHtml || '<b>Einde</b>');

        /*let crumbHtml = `<ul>
            ${breadCrumb.map(x => PROCEDURE.nodes.filter(y => y.id == x)[0]).reduce((agg, x, i) => agg += `
                <li class="node"><!--a href="#" class="goto${x.id}"-->${x.title || 'Volgende'}<!--/a--></li>
                ${breadCrumb[i + 1] ? `<li class="step">${x.edges.filter(y => y.target == breadCrumb[i + 1])[0].title || 'Volgende'}</li>` : ''}`, '')}
        </ul>`;

        setHtml('.breadcrumb', crumbHtml);*/
    }

    CONTAINER.onclick = e => {
        let nodeId = e.target.getAttribute('data-target');
        if (!nodeId) return true;
        navigateToNode(nodeId);
        return false;
    };

    return CONTAINER;
}