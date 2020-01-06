// todo: loop error detection
// todo: groups verspringen bij auto arrange

function Q(selector, ctx) {
    return $(selector, ctx)[0];
}

function createPopup() {
    var popup = Q('<div class="popup"></div>');
    var close = Q('<span class="close">+</span>');
    close.onclick = () => popup.parentNode.removeChild(popup);
    popup.appendChild(close);
    return popup;
}

window.onload = () => {
    let M = mxClient;
    if (!M.isBrowserSupported()) return alert('Browser not supported.');

    //Setup and styling of graph and editor
    var resourcePath = 'mxGraph/resources/';
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

    //Nudge
    function nudge(coord, direction) {
        graph.getSelectionCells().forEach(c => {
            var newGeo = c.geometry.clone();
            newGeo[coord] += direction * graph.gridSize;
            graph.getModel().setGeometry(c, newGeo)
        });
        updateProcedureFromGraph();
    }

    editor.addAction('nudgeLeft', function () { nudge('x', -1) });
    editor.addAction('nudgeRight', function () { nudge('x', 1) });
    editor.addAction('nudgeTop', function () { nudge('y', -1) });
    editor.addAction('nudgeBottom', function () { nudge('y', 1) });

    //For easy testing, following vars are in window scope (todo: remove from window scope)
    window.graph = editor.graph;
    window.P = { title: 'Untitled procedure', contents: '', nodes: [], graph: '' };

    P.getItemById = function (id) {
        var allEdges = P.nodes.map(x => x.edges || []).reduce((arr, x) => arr = arr.concat(x), []);
        var allItems = P.nodes.concat(allEdges);
        return allItems.find(x => x.id == id);
    };

    Q('#procTitle textarea').value = P.title;

    //Replace an event to keep the graph container focused (which is better in some particular cases)
    var origGraphFireMouseEvent = graph.fireMouseEvent;
    graph.fireMouseEvent = function (evtName, me, sender) {
        if (evtName == mxEvent.MOUSE_DOWN) this.container.focus();
        origGraphFireMouseEvent.apply(this, arguments);
    };

    //Set default graph behaviour
    //graph.setPanning(true); //Panning does not work together with rubberband selection (?)
    //graph.panningHandler.ignoreCell = true;
    mxRubberband.prototype.fadeOut = true;
    //window.rubber = new mxRubberband(graph); //Enable multi mouse selection ... enabled by default (?)
    graph.setHtmlLabels(true);
    graph.setConnectable(true);
    graph.setAllowDanglingEdges(false);
    graph.setCellsEditable(false); //Label editing is done with our own custom properties pane
    graph.setTooltips(false);
    graph.setCellsCloneable(false); //Prevent cloning cells by dragging them while holding down <ctrl>
    graph.setCellsDisconnectable(false); //Prevents dragging edges to other nodes (prevent double edges)
    mxEvent.disableContextMenu(container);
    mxGraphHandler.prototype.guidesEnabled = true;
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

    //Default geometry and style
    var defaults = {
        startStyle: 'resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#66CC00;',
        endStyle: 'resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#FF6666;',
        groupStyle: 'shadow=0;rounded=0;dashed=1;dashPattern=1 2;strokeColor=#000000;',
        nodeWidth: 140,
        nodeHeight: 80,
        groupWidth: 300,
        groupHeight: 180
    };

    //Helper for (custom) type of cell
    Object.defineProperty(mxCell.prototype, '_type', {
        get: function () {
            if (this.edge) return 'edge';
            if ((this.style || '') == defaults.startStyle) return 'start';
            if ((this.style || '') == defaults.endStyle) return 'end';
            if ((this.style || '') == defaults.groupStyle) return 'group';
            return 'node';
        }
    });

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
        var pre = Q('<pre />')
        pre.appendChild(document.createTextNode(xml));
        popup.appendChild(pre);
        Q('body').appendChild(popup);
    };

    Q('#save').onclick = function () {
        var element = document.createElement('a');
        var json = JSON.stringify(P, null, '    ');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
        element.setAttribute('download', P.title + '.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
            if (type == 'node') addOverlays(cells[0]);
        }
    };

    var dragEl1 = Q(`<div style="box-sizing:border-box;border:solid #000 1px;width:${defaults.nodeWidth}px;height:${defaults.nodeHeight}px;border-radius:10px;"></div>`);
    var dragSource1 = mxUtils.makeDraggable(Q('#newNode'), () => graph, (graph, evt, target, x, y) => afterDrag('node', target, x, y), dragEl1, null, null, graph.autoscroll, true);
    dragSource1.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl2 = Q('<div style="box-sizing:border-box;border:solid #66CC00 2px;width:40px;height:40px;border-radius:40px;"></div>');
    var dragSource2 = mxUtils.makeDraggable(Q('#newStart'), () => graph, (graph, evt, target, x, y) => afterDrag('start', target, x, y), dragEl2, null, null, graph.autoscroll, true);
    dragSource2.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl3 = Q('<div style="box-sizing:border-box;border:solid #FF6666 2px;width:40px;height:40px;border-radius:40px;"></div>');
    var dragSource3 = mxUtils.makeDraggable(Q('#newEnd'), () => graph, (graph, evt, target, x, y) => afterDrag('end', target, x, y), dragEl3, null, null, graph.autoscroll, true);
    dragSource3.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragEl4 = Q(`<div style="box-sizing:border-box;border:1px dotted #000;width:${defaults.groupWidth}px;height:${defaults.groupHeight}px;"></div>`);
    var dragSource4 = mxUtils.makeDraggable(Q('#newGroup'), () => graph, (graph, evt, target, x, y) => afterDrag('group', target, x, y), dragEl4, null, null, graph.autoscroll, true);
    dragSource4.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    //Overlays
    function addOverlays(cell) {
        if (cell._type !== 'node') return;

        var overlay1 = new mxCellOverlay(new mxImage(resourcePath + 'new_bottom.png', 16, 16), '');
        overlay1.cursor = 'hand';
        overlay1.align = mxConstants.ALIGN_CENTER;
        overlay1.offset = new mxPoint(0, -13);
        overlay1.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell); }));
        overlay1.addListener(mxEvent.MOUSE_MOVE, mxUtils.bind(this, function (sender, evt) { console.log(sender, evt); }));
        graph.addCellOverlay(cell, overlay1);

        var overlay2 = new mxCellOverlay(new mxImage(resourcePath + 'new_right.png', 16, 16), '');
        overlay2.cursor = 'hand';
        overlay2.align = mxConstants.ALIGN_RIGHT;
        overlay2.verticalAlign = mxConstants.ALIGN_MIDDLE;
        overlay2.offset = new mxPoint(-13, 0);
        overlay2.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell, true); }));
        graph.addCellOverlay(cell, overlay2);
    }

    function addChild(graph, cell, horizontal) {
        try {
            graph.getModel().beginUpdate();
            var parent = graph.getDefaultParent();
            var newCell = graph.insertVertex(parent, null, 'Step ' + (P.nodes.length + 1));
            var geometry = graph.getModel().getGeometry(newCell);

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

            //Make sure there is no node at position x,y
            function spc() {
                return graph
                    .getChildCells()
                    .filter(x => x._type == 'node')
                    .filter(x => x != newCell)
                    .find(x => x.geometry.x == geometry.x && x.geometry.y == geometry.y);
            };

            let samePositionCell = spc();
            while (samePositionCell) {
                if (horizontal) geometry.y += samePositionCell.geometry.height + 20;
                else geometry.x += samePositionCell.geometry.width + 20;
                samePositionCell = spc();
            }

            graph.insertEdge(parent, null, '', cell, newCell);
            addOverlays(newCell);
        }
        finally {
            graph.getModel().endUpdate();
        }
    }

    //Export to image/png
    Q('#image').onclick = function () {
        graph.zoomActual();
        graph.clearSelection();
        var bounds = graph.getGraphBounds();

        var svg = Q('svg');
        var img = Q('<img/>');
        var img2 = Q('<img/>');
        var canvas = Q(`<canvas width="${bounds.width}" height="${bounds.height}"></canvas>`);

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

    //Import json
    function readFileAsync(file) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = () => { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    $('#open').on('change', async function (e) {
        graph.selectAll();
        graph.removeCells();

        //let p = await fetch('../procedures/boomkappen.json').then(r => r.json());
        let p = JSON.parse(await readFileAsync(e.target.files[0]));

        Q('#procTitle textarea').value = P.title = (p.title || '');
        Q('#procDesc [contentEditable]').innerHTML = P.contents = (p.contents || '');

        if (p.graph) {
            let xDoc = mxUtils.parseXml(p.graph);
            let codec = new mxCodec(xDoc);
            codec.decode(xDoc.documentElement, graph.getModel());
        } else {
            //This is the scenario where a procedure has never been in the visual manager, thus having no graph data
            try {
                updateProcedureOnGraphChange = false;
                graph.getModel().beginUpdate();
                let parent = graph.getDefaultParent();
                let inserts = {};

                //TODO revert cell ids to the imported ids, or not important ??
                p.nodes.forEach(n => {
                    let c = graph.insertVertex(parent, null, n.title, 0, 0, defaults.nodeWidth, defaults.nodeHeight);
                    addOverlays(c);
                    inserts[n.id] = c;
                });

                p.nodes.forEach(n => {
                    (n.edges || []).forEach(e => {
                        let c1 = inserts[n.id];
                        let c2 = inserts[e.target];
                        graph.insertEdge(parent, null, e.title, c1, c2);
                    });
                });
            }
            finally {
                graph.getModel().endUpdate();
                autoSize(true);
                Q('#horizontal').click();
                updateProcedureOnGraphChange = true;
                updateProcedureFromGraph();
            }
        }
    });

    //Zoom
    Q('#zoomReset').onclick = () => graph.zoomActual();
    Q('#zoomIn').onclick = () => graph.zoomIn();
    Q('#zoomOut').onclick = () => graph.zoomOut();
    Q('#zoomFit').onclick = () => graph.fit();

    //Auto size (Borrowed from https://github.com/jgraph/drawio/blob/master/src/main/webapp/js/mxgraph/Actions.js)
    function autoSize(doAllCells) {
        var cells = graph.getSelectionCells();
        if (doAllCells) cells = graph.getChildCells().filter(x => x._type == 'node');
        if (cells == null || !cells.length) return;

        try {
            graph.getModel().beginUpdate();

            cells.forEach(c => {
                if (graph.getModel().getChildCount(c)) {
                    graph.updateGroupBounds([c], 20);
                }
                else {
                    var state = graph.view.getState(c);
                    var geo = graph.getCellGeometry(c);

                    if (graph.getModel().isVertex(c) && state != null && state.text != null && geo != null && graph.isWrapping(c)) {
                        geo = geo.clone();
                        geo.height = (state.text.boundingBox.height + 2 * (state.style.spacing * graph.view.scale)) / graph.view.scale;
                        graph.getModel().setGeometry(c, geo);
                    }
                    else graph.updateCellSize(c);
                }
            });
        }
        finally {
            graph.getModel().endUpdate();
        }
    }

    Q('#autoSize').onclick = () => autoSize();

    //Auto arrange
    Q('#horizontal').onclick = function () {
        autoSize(true);
        mxHierarchicalLayout.prototype.edgeStyle = mxHierarchicalEdgeStyle.STRAIGHT;
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);
        layout.execute(graph.getDefaultParent());
    };

    /*Q('#vertical').onclick = function () {
        autoSize(true);
        mxHierarchicalLayout.prototype.edgeStyle = mxHierarchicalEdgeStyle.STRAIGHT;
        var layout = new mxHierarchicalLayout(graph);
        layout.execute(graph.getDefaultParent());
    };

    Q('#organic').onclick = function () {
        autoSize(true);
        var layout = new mxFastOrganicLayout(graph);
        layout.forceConstant = 120;
        layout.execute(graph.getDefaultParent());
    };*/

    //Main event and method to update our procedure object
    let updateProcedureOnGraphChange = true;

    function updateProcedureFromGraph() {
        P.graph = graphToXml();
        let cells = graph.getChildCells();

        P.nodes = cells.filter(x => x._type === 'node').map(n => ({
            id: n.id,
            title: n.value || '',
            start: cells.filter(x => x._type === 'edge' && x.source._type == 'start' && x.target == n).length > 0,
            contents: (P.getItemById(n.id) || {}).contents || '',
            edges: cells.filter(x => x._type === 'edge' && x.source == n && x.target._type === 'node').map(e => ({
                id: e.id,
                title: e.value || '',
                contents: (P.getItemById(e.id) || {}).contents || '',
                target: e.target.id,
            }))
        }));
    }

    graph.getModel().addListener(mxEvent.CHANGE, function () {
        if (updateProcedureOnGraphChange) updateProcedureFromGraph();
    });

    //Prevent drawing double or unwanted edges
    var origInsertEdgeHandler = mxConnectionHandler.prototype.insertEdge;

    mxConnectionHandler.prototype.insertEdge = function (parent, id, value, source, target, style) {
        var allEdges = graph.getChildCells().filter(x => x._type == 'edge');
        var existingEdge = allEdges.find(x => x.source == source && x.target == target || x.source == target && x.target == source);
        if (existingEdge) return alert('De cellen hebben al een verbinding.');
        if (target._type == 'start' || source._type == 'end' || (source._type == 'start' && target._type == 'end')) return;
        if (source._type == 'start' && allEdges.find(x => x.source == source)) return;
        return origInsertEdgeHandler.apply(this, arguments);
    };

    //On mouse move (for overlays)
    /*function removeAllOverlays() {
        graph.getChildCells().forEach(x => graph.removeCellOverlays(x));
    }

    graph.addMouseListener({
        mouseMove: function (sender, me) {
            if (me && me.state && me.state.cell) {
                if (me.state.cell.vertex && (!me.state.cell.overlays || me.state.cell.overlays.length == 0)) {
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
    });*/

    //On selection changed (for edit fields)
    graph.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
        Q('#itemTitle').style.display = Q('#itemDesc').style.display = 'none';

        if (graph.getSelectionCells().length !== 1) return;
        let cell = graph.getSelectionCells()[0];

        if (cell._type === 'node') {
            Q('#itemTitle').style.display = Q('#itemDesc').style.display = '';
            let pItem = P.getItemById(cell.id) || {};
            Q('#itemTitle textarea').value = pItem.title || '';
            Q('#itemDesc [contentEditable]').innerHTML = pItem.contents || '';
        }
        else if (cell._type === 'edge') {
            let sourceType = cell.source._type;
            let targetType = cell.target._type;

            if (sourceType === 'node' && targetType === 'node') {
                Q('#itemTitle').style.display = '';
                let pItem = P.getItemById(cell.id) || {};
                Q('#itemTitle textarea').value = pItem.title || '';
            }
        }
    });

    //Play
    Q('#play').onclick = async function () {
        if (Q('#player').style.display == '') {
            Q('#play').innerText = 'Play';
            Q('#player').style.display = 'none';
            Q('#properties').style.display = 'flex';
            return;
        }

        var layout = await fetch('../procedureplayer/layout1.html').then(r => r.text());
        var procedure = JSON.parse(JSON.stringify(P)); //Deep copy
        delete procedure.graph;
        var player = createProcedurePlayer(procedure, layout);
        Q('#player').innerHTML = '';
        Q('#player').appendChild(player);
        Q('#player').style.display = '';
        Q('#properties').style.display = 'none';
        Q('#play').innerText = 'Stop';
    };

    //Procedure text fields
    Q('#procTitle textarea').onkeyup = function (e) {
        P.title = e.target.value.replace(/(\r?\n|\r|\n)$/, '').trim();
    };

    Q('#procDesc [contentEditable]').onkeyup = function (e) {
        P.contents = e.target.innerHTML;
    };

    //Node text fields
    Q('#itemTitle textarea').onkeyup = function (e) {
        try {
            var newValue = graph.getSelectionCell().value = e.target.value.replace(/(\r?\n|\r|\n)$/, '').trim();
            graph.getModel().beginUpdate();
            var cell = graph.getSelectionCell();
            var edit = new mxCellAttributeChange(cell, 'value', newValue);
            graph.getModel().execute(edit);
        }
        finally {
            graph.getModel().endUpdate();
        }
    };

    Q('#itemDesc [contentEditable]').onkeyup = function (e) {
        var cell = graph.getSelectionCell();
        var item = P.getItemById(cell.id);
        item.contents = e.target.innerHTML;
    };

    //Rich text editors
    function updateCommandIcons(wysiwyg) {
        $('[data-command]', wysiwyg).toArray().forEach(x => {
            let isActive = document.queryCommandState($(x).data('command'));
            $(x).toggleClass('is-active', isActive);
        });
    }

    $('.wysiwyg-toolbar').on('click', '[data-command]', e => {
        let wysiwyg = e.target.closest('.wysiwyg');
        $('[contentEditable]', wysiwyg).focus();
        window.document.execCommand($(e.target).data('command'), false, null);
        updateCommandIcons(wysiwyg);
        $('[contentEditable]', wysiwyg).keyup(); //Triggers the update in our procedure object, todo clean up
    });

    $('[contentEditable]', '.wysiwyg').on('click keyup', e => updateCommandIcons(e.target.closest('.wysiwyg')));

    $('[contentEditable]').on('dblclick', 'img', e => {
        //testje
        e.target.outerHTML = prompt('Edit image:', e.target.outerHTML) || e.target.outerHTML;
    });
};