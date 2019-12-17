window.onload = () => {
    let M = mxClient;
    if (!M.isBrowserSupported()) return alert('Browser not supported.');

    //Setup and styling of graph and editor
    var resourcePath = '/proceduremanager/mxGraph/resources/';
    var container = Q('#graphContainer');
    var config = mxUtils.load(resourcePath + 'keyhandler-commons.xml').getDocumentElement();
    var editor = new mxEditor(config);
    editor.setGraphContainer(container);

    //Custom delete with confirmation
    function customDelete() {
        var cells = graph.getSelectionCells();
        if (!cells.length) return;
        if (confirm('De selectie wordt verwijderd.\nDoorgaan?'))
            graph.removeCells();
    }

    editor.addAction('customDelete', customDelete);
    Q('#delete').onclick = function () { customDelete(); };

    //For easy testing, following vars in window scope (todo: remove from window scope)
    window.graph = editor.graph;
    window.P = { title: '', contents: '', nodes: [], graph: '' };

    //Method to check if a cell is a real procedure step
    function cellIsProcedureStep(cell) {
        if ((cell.style || '').includes('ellipse')) return false; //Start or end points
        if ((cell.style || '').includes('dash')) return false; //Grouping boxes
        return true;
    }

    //Replace an event to keep the graph container focused (which is better in some cases)
    var origGraphFireMouseEvent = graph.fireMouseEvent;
    graph.fireMouseEvent = function (evtName, me, sender) {
        if (evtName == mxEvent.MOUSE_DOWN) this.container.focus();
        origGraphFireMouseEvent.apply(this, arguments);
    };

    //Set default graph behaviour
    graph.setHtmlLabels(true);
    graph.setPanning(true);
    graph.setConnectable(true);
    graph.setAllowDanglingEdges(false);
    graph.setCellsEditable(false); //Label editing is done with our custom properties pane
    graph.setTooltips(false);
    graph.setCellsCloneable(false); //Prevent cloning cells by dragging them while holding down <ctrl>
    mxEvent.disableContextMenu(container);
    mxGraphHandler.prototype.guidesEnabled = true;
    new mxRubberband(graph); //Enable multi mouse selection
    mxEdgeHandler.prototype.addEnabled = true;
    mxEdgeHandler.prototype.removeEnabled = true;

    //Set default edge style
    var style = {};
    style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_CONNECTOR;
    style[mxConstants.STYLE_STROKECOLOR] = '#4d4d4d';
    style[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;
    style[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE;
    style[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;
    style[mxConstants.STYLE_FONTSIZE] = 13;
    style[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = '#FFFFFF';
    style[mxConstants.STYLE_ROUNDED] = true;
    graph.getStylesheet().putDefaultEdgeStyle(style);

    //Set default node style
    mxConstants.SHADOW_OPACITY = .2;
    mxConstants.SHADOW_OFFSET_X = 4;
    mxConstants.SHADOW_OFFSET_Y = 4;
    mxConstants.HANDLE_FILLCOLOR = '#99ccff';
    mxConstants.HANDLE_STROKECOLOR = '#0088cf';
    mxConstants.VERTEX_SELECTION_COLOR = '#00a8ff';

    style = { ...graph.getStylesheet().styles.defaultVertex };
    style[mxConstants.STYLE_SHADOW] = true
    style[mxConstants.STYLE_FONTSIZE] = 14;
    style[mxConstants.STYLE_WHITE_SPACE] = 'wrap';
    style[mxConstants.STYLE_ROUNDED] = true;
    style[mxConstants.STYLE_ABSOLUTE_ARCSIZE] = true;
    style[mxConstants.STYLE_ARCSIZE] = 14;
    style[mxConstants.STYLE_STROKECOLOR] = '#000000';
    style[mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    style[mxConstants.STYLE_SPACING] = 15;
    style[mxConstants.STYLE_OVERFLOW] = 'visible'; //Important for our custom autosize function
    style[mxConstants.STYLE_FONTCOLOR] = '#000000';
    graph.getStylesheet().putDefaultVertexStyle(style);

    //Some helpers
    function getGraphCells(includeSpecials) {
        return Object
            .keys(graph.getModel().cells)
            .map(x => graph.getModel().cells[x])
            .filter(x => x.vertex && (includeSpecials || cellIsProcedureStep(x)));
    }

    function getProcedureItem(id) {
        var allEdges = P.nodes.map(x => x.edges || []).reduce((arr, x) => arr = arr.concat(x), []);
        var allItems = P.nodes.concat(allEdges);
        return allItems.find(x => x.id == id);
    }

    //Default geometry and style
    var defaults = {
        startStyle: 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#66CC00;',
        endStyle: 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#FF6666;',
        groupStyle: 'shadow=0;editable=0;rounded=0;dashed=1;dashPattern=1 1;strokeWidth=2;strokeColor=#777777;',
        nodeWidth: 140,
        nodeHeight: 80,
        groupWidth: 300,
        groupHeight: 180,
        nodeGeometry: '<mxGeometry x="40" y="40" width="140" height="80" as="geometry"/>',
        edgeGeometry: '<mxGeometry relative="1" as="geometry"/>'
    };

    //Import procedure json
    /*function randomId() {
        var c = 'abcdefghijklmnopqrstuvwxyz'.split('');
        return c.map(x => c[Math.floor(Math.random() * 26)]).join('');
    }

    function jsToXml() {
        var xml = '';

        function restoreLineBreaks(val) {
            return val.replace('\n', '&#xa;');
        }

        P.nodes.forEach(n => {
            xml += `<mxCell id="${n.id}" value="${restoreLineBreaks(n.title || '')}" style="${n.style || ''}" parent="1" vertex="1">${n.geometry || defaults.nodeGeometry}</mxCell>`;
            (n.edges || []).forEach(e => (xml += `<mxCell id="${e.id || randomId()}" value="${restoreLineBreaks(e.title || '')}" parent="1" source="${n.id}" target="${e.target}" edge="1">${e.geometry || defaults.edgeGeometry}</mxCell>`));
        });

        var xmlDoc = mxUtils.parseXml(`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml}</root></mxGraphModel>`);
        Q('#xml').value = mxUtils.getPrettyXml(xmlDoc.documentElement, '    ', '');
        Q('textarea', '#procTitle').value = P.title;
        Q('[contentEditable]', '#procDesc').innerHTML = P.contents;
    }*/

    //Convert xml to graph
    /*function xmlToGraph() {
        var xmlDoc = mxUtils.parseXml(Q('#xml').value);
        var dec = new mxCodec(xmlDoc);
        dec.decode(xmlDoc.documentElement, editor.graph.getModel());
    }*/

    //Convert graph to xml
    function graphToXml(pretty) {
        var encoder = new mxCodec();
        var node = encoder.encode(graph.getModel());
        if (pretty) return mxUtils.getPrettyXml(node, '    ', '');
        return mxUtils.getXml(node);
    }

    Q('#xml').onclick = function () {
        var popup = createPopup();
        var xml = graphToXml(true);
        var pre = createElement('pre')
        pre.appendChild(document.createTextNode(xml));
        popup.appendChild(pre);
        Q('body').appendChild(popup);
    };

    Q('#json').onclick = function () {
        var popup = createPopup();
        var json = JSON.stringify(P, null, '    ');
        var pre = createElement('pre')
        pre.appendChild(document.createTextNode(json));
        popup.appendChild(pre);
        Q('body').appendChild(popup);
    };

    //Drag new elements
    function afterDrag(type, target, x, y) {
        var geometry = new mxGeometry(0, 0, defaults.nodeWidth, defaults.nodeHeight);
        if (type == 'start') geometry = new mxGeometry(0, 0, 40, 40);
        if (type == 'end') geometry = new mxGeometry(0, 0, 40, 40);
        if (type == 'group') geometry = new mxGeometry(0, 0, defaults.groupWidth, defaults.groupHeight);

        var title = type == 'node' ? ('Step ' + (P.nodes.length + 1)) : null;
        var cell = new mxCell(title, geometry);
        cell.vertex = true;

        if (type == 'start') cell.style = defaults.startStyle;
        if (type == 'end') cell.style = defaults.endStyle;
        if (type == 'group') cell.style = defaults.groupStyle;

        var cells = graph.importCells([cell], x, y, target);

        if (cells != null && cells.length > 0) {
            graph.scrollCellToVisible(cells[0]);
            graph.setSelectionCells(cells);
            if (type == 'group') {
                graph.orderCells(true); //Send to background
                cells[0].setConnectable(false);
            }
        }
    };

    var dragEl1 = createElement(`<div style="background:white;border:solid #000000 1px;width:${defaults.nodeWidth}px;height:${defaults.nodeHeight}px;border-radius:10px;"></div>`);
    var dragSource1 = mxUtils.makeDraggable(Q('#newNode'), () => graph, (graph, evt, target, x, y) => afterDrag('node', target, x, y), dragEl1, null, null, graph.autoscroll, true);
    dragSource1.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl2 = createElement('<div style="background:white;border:solid #66CC00 2px;width:40px;height:40px;border-radius:40px;"></div>');
    var dragSource2 = mxUtils.makeDraggable(Q('#newStart'), () => graph, (graph, evt, target, x, y) => afterDrag('start', target, x, y), dragEl2, null, null, graph.autoscroll, true);
    dragSource2.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl3 = createElement('<div style="background:white;border:solid #FF6666 2px;width:40px;height:40px;border-radius:40px;"></div>');
    var dragSource3 = mxUtils.makeDraggable(Q('#newEnd'), () => graph, (graph, evt, target, x, y) => afterDrag('end', target, x, y), dragEl3, null, null, graph.autoscroll, true);
    dragSource3.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl4 = createElement(`<div style="background:white;border:2px dotted #777777;width:${defaults.groupWidth}px;height:${defaults.groupHeight}px;"></div>`);
    var dragSource4 = mxUtils.makeDraggable(Q('#newGroup'), () => graph, (graph, evt, target, x, y) => afterDrag('group', target, x, y), dragEl4, null, null, graph.autoscroll, true);
    dragSource4.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    //Overlays
    function addOverlays(cell) {
        if (!cellIsProcedureStep(cell)) return;

        var overlay1 = new mxCellOverlay(new mxImage(resourcePath + 'new2.png', 16, 16), '');
        overlay1.cursor = 'hand';
        overlay1.align = mxConstants.ALIGN_CENTER;
        overlay1.offset = new mxPoint(0, -12);
        overlay1.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell); }));
        graph.addCellOverlay(cell, overlay1);

        var overlay2 = new mxCellOverlay(new mxImage(resourcePath + 'new.png', 16, 16), '');
        overlay2.cursor = 'hand';
        overlay2.align = mxConstants.ALIGN_RIGHT;
        overlay2.verticalAlign = mxConstants.ALIGN_MIDDLE;
        overlay2.offset = new mxPoint(-12, 0);
        overlay2.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell, true); }));
        graph.addCellOverlay(cell, overlay2);
    }

    function addChild(graph, cell, horizontal) {
        var model = graph.getModel();
        var parent = graph.getDefaultParent();

        try {
            model.beginUpdate();
            var newCell = graph.insertVertex(parent, null, 'Step ' + (P.nodes.length + 1));
            var geometry = model.getGeometry(newCell);

            geometry.width = defaults.nodeWidth;
            geometry.height = defaults.nodeHeight;

            if (horizontal) {
                geometry.x = cell.geometry.x + cell.geometry.width + 120;
                geometry.y = cell.geometry.y + ((cell.geometry.height - defaults.nodeHeight) / 2);
            }
            else {
                geometry.x = cell.geometry.x + ((cell.geometry.width - defaults.nodeWidth) / 2);
                geometry.y = cell.geometry.y + cell.geometry.height + 80;
            }

            //Make sure there is no node at those positions
            function spn() { return getGraphCells().filter(x => x != newCell).find(x => x.geometry.x == geometry.x && x.geometry.y == geometry.y); };
            var samePositionNode = spn();
            while (samePositionNode) {
                geometry.x += 20;
                geometry.y += 20;
                samePositionNode = spn();
            }

            graph.insertEdge(parent, null, '', cell, newCell);
        }
        finally {
            model.endUpdate();
        }
    }

    //Export to image/png
    Q('#export').onclick = function () {
        graph.zoomActual();
        graph.clearSelection();
        var bounds = graph.getGraphBounds();

        var svg = Q('svg');
        var img = createElement('img');
        var img2 = createElement('img');
        var canvas = createElement(`<canvas width="${bounds.width}" height="${bounds.height}"></canvas>`);

        img.onload = function () {
            canvas.getContext('2d').drawImage(img, -1 * bounds.x, -1 * bounds.y);
            img2.src = canvas.toDataURL('image/png');
            var popup = createPopup();
            popup.append(img2);
            Q('body').appendChild(popup);
        }

        var xml = new XMLSerializer().serializeToString(svg);
        xml = xml.replace('<svg xmlns="http://www.w3.org/2000/svg" style="', `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width + bounds.x}" height="${bounds.height + bounds.y}" style="background-color:white;`); //https://stackoverflow.com/questions/43165562/canvas-todataurl-returns-blank-image-in-firefox-even-with-onload-and-callback
        img.src = 'data:image/svg+xml;base64,' + btoa(xml);
    };

    //Zooming
    Q('#zoomReset').onclick = () => graph.zoomActual();
    Q('#zoomIn').onclick = () => graph.zoomIn();
    Q('#zoomOut').onclick = () => graph.zoomOut();
    Q('#zoomFit').onclick = () => graph.fit();

    //Auto size
    function autoSize(doAllCells) {
        var cells = doAllCells ? getGraphCells(false) : graph.getSelectionCells();
        if (cells == null || !cells.length) return;

        graph.getModel().beginUpdate();
        try {
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];

                if (graph.getModel().getChildCount(cell)) {
                    graph.updateGroupBounds([cell], 20);
                }
                else {
                    var state = graph.view.getState(cell);
                    var geo = graph.getCellGeometry(cell);

                    if (graph.getModel().isVertex(cell) && state != null && state.text != null && geo != null && graph.isWrapping(cell)) {
                        geo = geo.clone();
                        geo.height = (state.text.boundingBox.height + 2 * (state.style.spacing * graph.view.scale)) / graph.view.scale;
                        graph.getModel().setGeometry(cell, geo);
                    }
                    else {
                        graph.updateCellSize(cell);
                    }
                }
            }
        }
        finally {
            graph.getModel().endUpdate();
        }
    }

    Q('#autoSize').onclick = () => autoSize();

    //Auto arrange
    Q('#vertical').onclick = function () {
        autoSize(true);
        mxHierarchicalLayout.prototype.edgeStyle = mxHierarchicalEdgeStyle.STRAIGHT;
        var layout = new mxHierarchicalLayout(graph);
        layout.execute(graph.getDefaultParent());
    };

    Q('#horizontal').onclick = function () {
        autoSize(true);
        mxHierarchicalLayout.prototype.edgeStyle = mxHierarchicalEdgeStyle.STRAIGHT;
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);
        layout.execute(graph.getDefaultParent());
    };

    Q('#organic').onclick = function () {
        autoSize(true);
        var layout = new mxFastOrganicLayout(graph);
        layout.forceConstant = 120;
        layout.execute(graph.getDefaultParent());
    };

    //Graph events
    function updateProcedureFromGraph() {
        P.graph = graphToXml();

        var xDoc = mxUtils.parseXml(P.graph);
        var allGraphItems = [...xDoc.documentElement.getElementsByTagName('mxCell')];
        var nodeCells = allGraphItems.filter(c => c.getAttribute('vertex'));
        var edgeCells = allGraphItems.filter(c => c.getAttribute('edge'));

        function attributesToObject(xmlElement) {
            return xmlElement ? [...xmlElement.attributes]
                .map(y => ({ k: y.name, v: y.value }))
                .reduce((agg, z) => { agg[z.k] = z.v; return agg; }, {})
                : null;
        }

        nodeCells = nodeCells.map(attributesToObject);
        edgeCells = edgeCells.map(attributesToObject);

        function isNodeReferencedByStartNode(cell) {
            let incomingEdges = edgeCells.filter(e => e.target == cell.id);
            let incomingNodeIds = incomingEdges.map(e => e.source);
            let incomingNodes = nodeCells.filter(x => incomingNodeIds.includes(x.id));
            return !!incomingNodes.filter(x => x.style == defaults.startStyle).length;
        }

        P.nodes = nodeCells
            .filter(cellIsProcedureStep)
            .map(n => ({
                id: n.id,
                title: n.value || null,
                start: isNodeReferencedByStartNode(n),
                contents: (getProcedureItem(n.id) || {}).contents || '',
                edges: edgeCells
                    .filter(e => e.source == n.id)
                    //.filter(e => nodeCells.find(_ => _.id == e.target).style == defaults.endStyle) //Clean up edges going to end node
                    .map(e => ({
                        id: e.id,
                        title: e.value || null,
                        contents: (getProcedureItem(e.id) || {}).contents || '',
                        target: e.target,
                    }))
            }));
    }

    graph.getModel().addListener(mxEvent.CHANGE, function () {
        updateProcedureFromGraph();
    });

    function removeAllOverlays() {
        var cells = getGraphCells(true);
        cells.forEach(x => graph.removeCellOverlays(x));
    }

    graph.addMouseListener({
        mouseMove: function (sender, me) {
            if (me && me.state && me.state.cell) {
                if (me.state.cell.vertex && isEmpty(me.state.cell.overlays)) {
                    removeAllOverlays();
                    addOverlays(me.state.cell);
                }
            }
            else removeAllOverlays();
        },
        mouseDown: function (sender, me) { },
        mouseUp: function (sender, me) { },
        dragEnter: function (evt, state) { },
        dragLeave: function (evt, state) { }
    });

    graph.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
        var cells = graph.getSelectionCells();
        var cell = cells[0];

        if (cells.length === 1 && cell && cellIsProcedureStep(cell)) {
            Q('#itemTitle').style.display = '';
            Q('#itemDesc').style.display = '';

            var item = getProcedureItem(cell.id) || {};
            Q('textarea', '#itemTitle').value = item.title || '';
            Q('[contentEditable]', '#itemDesc').innerHTML = item.contents || '';
        }
        else {
            Q('#itemTitle').style.display = 'none';
            Q('#itemDesc').style.display = 'none';
        }
    });

    //Procedure text fields
    Q('textarea', '#procTitle').onkeyup = function (e) {
        P.title = e.target.value;
    };

    Q('[contentEditable]', '#procDesc').onkeyup = function (e) {
        P.contents = e.target.innerHTML;
    };

    //Node text fields
    Q('textarea', '#itemTitle').onkeyup = function (e) {
        var newValue = graph.getSelectionCell().value = e.target.value;
        graph.getModel().beginUpdate();

        try {
            var cell = graph.getSelectionCell();
            var edit = new mxCellAttributeChange(cell, 'value', newValue);
            graph.getModel().execute(edit);
        }
        finally {
            graph.getModel().endUpdate();
        }
    };

    Q('[contentEditable]', '#itemDesc').onkeyup = function (e) {
        var cell = graph.getSelectionCell();
        var item = getProcedureItem(cell.id);
        item.contents = e.target.innerHTML;
    };

    //Play
    Q('#play').onclick = async function () {
        var layout = await fetch('/procedureplayer/layout1.html').then(r => r.text());
        var procedure = JSON.parse(JSON.stringify(P)); //Deep copy
        var player = createProcedurePlayer(procedure, layout);
        var popup = createPopup();
        popup.appendChild(player);
        Q('body').appendChild(popup);
    };
};