window.onload = () => {
    let M = mxClient;

    if (!M || !M.isBrowserSupported) {
        alert('mxGraph not found.');
        return;
    }

    if (!M.isBrowserSupported()) {
        alert('Browser not supported.');
        return;
    }

    /*var model = new mxGraphModel();
    window.graph = new mxGraph(container, model);*/

    var container = document.getElementById('sandbox');
    var config = mxUtils.load('/static/mxClient/resources/keyhandler-commons.xml').getDocumentElement();
    var editor = new mxEditor(config);
    editor.setGraphContainer(container);
    window.graph = editor.graph;
    window.model = graph.getModel();
    graph.setHtmlLabels(true);
    graph.setPanning(true);
    graph.setConnectable(true);
    graph.allowDanglingEdges = false;
    mxEvent.disableContextMenu(container);
    mxGraphHandler.prototype.guidesEnabled = true; // Enables guides
    var parent = graph.getDefaultParent();
    new mxRubberband(graph); //Enable mouse selection

    model.beginUpdate();

    var style = [];
    style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR;
    style[mxConstants.STYLE_STROKECOLOR] = '#6482B9';
    style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
    style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE;
    style[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;
    style[mxConstants.STYLE_FONTSIZE] = '15';
    style[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = '#FFFFFF';
    graph.getStylesheet().putDefaultEdgeStyle(style);

    style = { ...graph.getStylesheet().styles.defaultVertex };
    style[mxConstants.STYLE_FONTSIZE] = '15';
    style[mxConstants.STYLE_WHITE_SPACE] = 'wrap';
    style[mxConstants.STYLE_ROUNDED] = true;
    graph.getStylesheet().putDefaultVertexStyle(style);

    try {
        var defaultSize = { w: 130, h: 80 };
        var v1 = graph.insertVertex(parent, null, 'Gebeurt de doorzoeking op heterdaad?', 80, 40, defaultSize.w, defaultSize.h);
        var v2 = graph.insertVertex(parent, null, 'Geeft de eigenaar toestemming?', 320, 190, defaultSize.w, defaultSize.h);
        var v3 = graph.insertVertex(parent, null, 'Je moet niks doen.', 460, 40, defaultSize.w, defaultSize.h);
        addOverlays(graph, v1);
        addOverlays(graph, v2);
        addOverlays(graph, v3);
        var e1 = graph.insertEdge(parent, null, 'Ja', v1, v2);
        var e2 = graph.insertEdge(parent, null, 'Neen', v1, v3);
    }
    finally {
        model.endUpdate();
    }

    document.getElementById('toJson').onclick = function () {
        var attributesToObject = function (el) {
            return el ? [...el.attributes]
                .map(y => ({ k: y.name, v: y.value }))
                .reduce((agg, z) => { agg[z.k] = z.v; return agg; }, {})
                : null;
        };

        var encoder = new mxCodec();
        var node = encoder.encode(graph.getModel());
        var nodeCells = [...node.getElementsByTagName('mxCell')].filter(x => x.getAttribute('vertex'));
        console.log(nodeCells);
        var edgeCells = [...node.getElementsByTagName('mxCell')].filter(x => x.getAttribute('edge'));
        var nodes = nodeCells
            .map(x => Object.assign({ geometry: attributesToObject(x.getElementsByTagName('mxGeometry')[0]) }, attributesToObject(x)))
            .map(x => ({
                id: x.id,
                title: x.value,
                edges: edgeCells.map(attributesToObject).filter(y => y.source == x.id).map(y => ({ title: y.value, target: y.target }))
            }));
        document.getElementById('json').innerHTML = JSON.stringify(nodes, null, '   ');;
    };

    document.getElementById('arrange').onclick = function () {
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_NORTH);
        var selectionCells = graph.getSelectionCells();
        layout.execute(graph.getDefaultParent(), selectionCells.length == 0 ? null : selectionCells);
    };

    document.getElementById('fromJson').onclick = function () {
        alert(123)
    };

    function addOverlays(graph, cell) {
        var overlay = new mxCellOverlay(new mxImage('/static/mxClient/resources/add.png', 24, 24), 'Add child');
        overlay.cursor = 'hand';
        overlay.align = mxConstants.ALIGN_CENTER;
        overlay.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) {
            addChild(graph, cell);
        }));

        graph.addCellOverlay(cell, overlay);

        overlay = new mxCellOverlay(new mxImage('/static/mxClient/resources/close.png', 30, 30), 'Delete');
        overlay.cursor = 'hand';
        overlay.offset = new mxPoint(-4, 8);
        overlay.align = mxConstants.ALIGN_RIGHT;
        overlay.verticalAlign = mxConstants.ALIGN_TOP;
        overlay.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) {
            deleteSubtree(graph, cell);
        }));

        graph.addCellOverlay(cell, overlay);
    };


    function addChild(graph, cell) {
        var model = graph.getModel();
        var parent = graph.getDefaultParent();
        var vertex;

        model.beginUpdate();
        try {
            vertex = graph.insertVertex(parent, null, 'Nieuwe stap');
            var geometry = model.getGeometry(vertex);

            // Updates the geometry of the vertex with the
            // preferred size computed in the graph
            //var size = graph.getPreferredSizeForCell(vertex);
            geometry.x = cell.geometry.x;
            geometry.y = cell.geometry.y + cell.geometry.height + 70;
            geometry.width = cell.geometry.width;
            geometry.height = cell.geometry.height;

            // Adds the edge between the existing cell
            // and the new vertex and executes the
            // automatic layout on the parent
            var edge = graph.insertEdge(parent, null, 'Nieuwe keuze', cell, vertex);

            // Configures the edge label "in-place" to reside
            // at the end of the edge (x = 1) and with an offset
            // of 20 pixels in negative, vertical direction.
            edge.geometry.x = 1;
            edge.geometry.y = 0;
            edge.geometry.offset = new mxPoint(0, -20);

            addOverlays(graph, vertex, true);
        }
        finally {
            model.endUpdate();
        }

        return vertex;
    };

    function deleteSubtree(graph, cell) {
        // Gets the subtree from cell downwards
        var cells = [];
        graph.traverse(cell, true, function (vertex) {
            cells.push(vertex);

            return true;
        });

        graph.removeCells(cells);
    };
};