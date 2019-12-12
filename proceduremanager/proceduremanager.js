/*

- [OK] veldjes invullen / node selecteren en description invullen
- [ON] printen to image/pdf
- [OK] betere icons / hover state
- [OK] desc invullen van pijl lukt niet
- [ON HOLD] end node liquideren ?
- [OK] nieuwe nodes: checken als er al 1 staat op die xy coordinaat
- [OK] zoom knoppen
- [OK] drawing scroll bars
- [OK] delete toets met warning
- [OK] align new nodes with centers
- import/scriptje maken van xcs (boom kappen)
- validatie popup/div
- knop om afspeelomgeving te openen

- multi edit van props van nodes ?
- grouping/folding/fases, mss in eerste instantie gewoon de ctrl-g van draw.io met kadertje errond ? nee, wel groups

*/

window.onload = () => {
    let M = mxClient;

    //Browser check
    if (!M.isBrowserSupported()) {
        alert('Browser not supported.');
        return;
    }

    //Setup and styling of graph and editor
    var resourcePath = '/proceduremanager/mxGraph/resources/';
    var container = Q('#drawing');
    var config = mxUtils.load(resourcePath + 'keyhandler-commons.xml').getDocumentElement();
    var editor = new mxEditor(config);

    editor.addAction('customDelete', function() {
        var cells = graph.getSelectionCells();
        if (!cells.length) return;
        if (confirm('Het item wordt verwijderd.')) editor.graph.removeCells();
    });

    editor.setGraphContainer(container);
    var graph = editor.graph;

    var origGraphFireMouseEvent = graph.fireMouseEvent;
    graph.fireMouseEvent = function(evtName, me, sender) //Keep graph focused
    {
      if (evtName == mxEvent.MOUSE_DOWN) this.container.focus();
      origGraphFireMouseEvent.apply(this, arguments);
    };

    (() => {
        graph.setHtmlLabels(true);
        graph.setPanning(true);
        graph.setConnectable(true);
        graph.setAllowDanglingEdges(false);
        //graph.setEdgeLabelsMovable(false);
        graph.setTooltips(false);
        graph.setCellsCloneable(false); //Prevent cloning cells by dragging them while holding down <ctrl>
        //mxEvent.disableContextMenu(container);
        mxGraphHandler.prototype.guidesEnabled = true; // Enables guides
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
        //style[mxConstants.STYLE_ROUNDED] = true;
        //style[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ELBOW;
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
        style[mxConstants.STYLE_STROKECOLOR] = '#4d4d4d';
        style[mxConstants.STYLE_FILLCOLOR] = '#ffffff';
        style[mxConstants.STYLE_SPACING] = 15;
        style[mxConstants.STYLE_OVERFLOW] = 'hidden';
        style[mxConstants.STYLE_FONTCOLOR] = '#000000';
        graph.getStylesheet().putDefaultVertexStyle(style);
    })();

    //Convert xml to json
    var PROC = { title: '', contents: '', nodes: [] };

    function getProcedureItem(id) {
        var allEdges = PROC.nodes.map(x => x.edges).reduce((arr, x) => arr = arr.concat(x), []);
        var allItems = PROC.nodes.concat(allEdges);
        return allItems.find(x => x.id == id);
    }

    var defaults = {
        start: 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#66CC00;',
        end: 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#FF6666;',
        nodeWidth: 140,
        nodeHeight: 80
    };

    /*var nodeGeometry = '<mxGeometry x="40" y="40" width="140" height="80" as="geometry"/>';
    var startGeometry = '<mxGeometry x="40" y="40" width="40" height="40" as="geometry"/>';
    var endGeometry = '<mxGeometry x="40" y="40" width="40" height="40" as="geometry"/>';
    var edgeGeometry = '<mxGeometry relative="1" as="geometry"/>';*/

    function showJson() {
        Q('#json').value = JSON.stringify(PROC, (key, value) => { if (value !== null) return value }, '    ');
    }

    function xmlToJs() {
        var doc = mxUtils.parseXml(Q('#xml').value.trim());
        var cells = [...doc.documentElement.getElementsByTagName('mxCell')];
        var nodeCells = cells.filter(c => c.getAttribute('vertex'));
        var edgeCells = cells.filter(c => c.getAttribute('edge'));

        function attributesToObject(el) {
            return el ? [...el.attributes]
                .map(y => ({ k: y.name, v: y.value }))
                .reduce((agg, z) => { agg[z.k] = z.v; return agg; }, {})
                : null;
        }

        var nodes = nodeCells
            .map(n => {
                var nn = attributesToObject(n);
                return {
                    id: nn.id, //.replace(/^_/, ''),
                    title: nn.value || null,
                    contents: (getProcedureItem(nn.id) || {}).contents || '',
                    geometry: n.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, ''),
                    style: nn.style || null,
                    edges: edgeCells
                        .filter(e => e.getAttribute('source') == n.id)
                        .map(e => {
                            var ee = attributesToObject(e);
                            return {
                                id: ee.id, //.replace(/^_/, ''),
                                title: ee.value || null,
                                contents: (getProcedureItem(ee.id) || {}).contents || '',
                                target: ee.target, //.replace(/^_/, ''),
                                geometry: e.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, '')
                            };
                        })
                };
            });

        PROC.title = Q('textarea', '#procTitle').value;
        PROC.contents = Q('[contentEditable]', '#procDesc').innerHTML;
        PROC.nodes = nodes;

        showJson();
    }

    Q('#xmlToJs').onclick = xmlToJs;

    //Convert json to xml
    function randomId() {
        var c = 'abcdefghijklmnopqrstuvwxyz'.split('');
        return c.map(x => c[Math.floor(Math.random() * 26)]).join('');
    }

    function jsToXml() {
        var xml = '';

        function restoreLineBreaks(val) {
            return val.replace('\n', '&#xa;');
        }

        PROC.nodes.forEach(n => {
            xml += `<mxCell id="${n.id}" value="${restoreLineBreaks(n.title || '')}" style="${n.style || ''}" parent="1" vertex="1">${n.geometry}</mxCell>`;
            (n.edges || []).forEach(e => (xml += `<mxCell id="${e.id || randomId()}" value="${restoreLineBreaks(e.title || '')}" parent="1" source="${n.id}" target="${e.target}" edge="1">${e.geometry}</mxCell>`));
        });

        var xmlDoc = mxUtils.parseXml(`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml}</root></mxGraphModel>`);
        Q('#xml').value = mxUtils.getPrettyXml(xmlDoc.documentElement, '    ', '');
        Q('textarea', '#procTitle').value = PROC.title;
        Q('[contentEditable]', '#procDesc').innerHTML = PROC.contents;
    }

    Q('#jsToXml').onclick = jsToXml;

    //Auto arrange
    Q('#vertical').onclick = function () {
        var layout = new mxHierarchicalLayout(graph);
        layout.execute(graph.getDefaultParent());
    };

    Q('#horizontal').onclick = function () {
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);
        layout.execute(graph.getDefaultParent());
    };

    Q('#organic').onclick = function () {
        var layout = new mxFastOrganicLayout(graph);
        layout.forceConstant = 120;
        layout.execute(graph.getDefaultParent());
    };

    //Convert graph to xml
    function graphToXml() {
        var encoder = new mxCodec();
        var node = encoder.encode(graph.getModel());
        Q('#xml').value = mxUtils.getPrettyXml(node, '    ', '');
    }

    Q('#graphToXml').onclick = graphToXml;

    //Convert xml to graph
    function xmlToGraph() {
        var xmlDoc = mxUtils.parseXml(Q('#xml').value);
        var dec = new mxCodec(xmlDoc);
        dec.decode(xmlDoc.documentElement, editor.graph.getModel());
    }

    Q('#xmlToGraph').onclick = xmlToGraph;

    //Load and save json
    Q('#loadJson').onclick = async function () {
        var path = /*prompt('Procedure path',*/ '/procedures/procedure3.json';
        PROC = await fetch(path).then(r => r.json());
        showJson();
        jsToXml();
        xmlToGraph();
    };

    Q('#saveJson').onclick = async function () {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(Q('#json').value));
        element.setAttribute('download', 'procedure1.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    //Panels enlarge
    Q('.enlarge').forEach(x => x.onclick = function (e) {
        Q('.luik').forEach(x => x.style.width = '15%');
        e.target.closest('.luik').style.width = '55%';
    });

    //Drag a new node
    function afterDrag(type, target, x, y) {
        var cell = new mxCell(type == 'node' ? 'Nieuwe stap' : null, new mxGeometry(0, 0, type == 'node' ? 140 : 40, type == 'node' ? 80 : 40));
        cell.vertex = true;
        if (type == 'start') cell.style = defaults.start;
        if (type == 'end') cell.style = defaults.end;
        var cells = graph.importCells([cell], x, y, target);

        if (cells != null && cells.length > 0) {
            graph.scrollCellToVisible(cells[0]);
            graph.setSelectionCells(cells);
        }
    };

    var dragEl1 = document.createElement('div');
    dragEl1.style.border = 'dashed grey 1px';
    dragEl1.style.width = '140px';
    dragEl1.style.height = '80px';
    dragEl1.style.borderRadius = '10px';

    var dragSource1 = mxUtils.makeDraggable(Q('#newNode'), () => graph, (graph, evt, target, x, y) => afterDrag('node', target, x, y), dragEl1, null, null, graph.autoscroll, true);
    dragSource1.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    //Drag new start/end node
    var dragEl2 = document.createElement('div');
    dragEl2.style.border = 'dashed grey 2px';
    dragEl2.style.width = dragEl2.style.height = dragEl2.style.borderRadius = '40px';

    var dragSource2 = mxUtils.makeDraggable(Q('#newStart'), () => graph, (graph, evt, target, x, y) => afterDrag('start', target, x, y), dragEl2, null, null, graph.autoscroll, true);
    dragSource2.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragSource3 = mxUtils.makeDraggable(Q('#newEnd'), () => graph, (graph, evt, target, x, y) => afterDrag('end', target, x, y), dragEl2, null, null, graph.autoscroll, true);
    dragSource3.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    //Overlays
    function addOverlays(cell) {
        var overlay1 = new mxCellOverlay(new mxImage(resourcePath + 'new2.png', 16, 16), 'Nieuwe stap');
        overlay1.cursor = 'hand';
        overlay1.align = mxConstants.ALIGN_CENTER;
        overlay1.offset = new mxPoint(0, -12);
        overlay1.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell); }));
        graph.addCellOverlay(cell, overlay1);

        var overlay2 = new mxCellOverlay(new mxImage(resourcePath + 'new.png', 16, 16), 'Nieuwe stap');
        overlay2.cursor = 'hand';
        overlay2.align = mxConstants.ALIGN_RIGHT;
        overlay2.verticalAlign = mxConstants.ALIGN_MIDDLE;
        overlay2.offset = new mxPoint(-12, 0);
        overlay2.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell, true); }));
        graph.addCellOverlay(cell, overlay2);

        /*var overlay3 = new mxCellOverlay(new mxImage(resourcePath + 'delete.png', 16, 16), 'Verwijderen');
        overlay3.cursor = 'hand';
        overlay3.offset = new mxPoint(12, 14);
        overlay3.align = mxConstants.ALIGN_LEFT;
        overlay3.verticalAlign = mxConstants.ALIGN_TOP;
        overlay3.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { deleteSubtree(graph, cell); }));
        graph.addCellOverlay(cell, overlay3);*/
    }

    function addChild(graph, cell, horizontal) {
        var model = graph.getModel();
        var parent = graph.getDefaultParent();

        try {
            model.beginUpdate();
            var newCell = graph.insertVertex(parent, null, 'Nieuwe stap');
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
            function spn() { return Object.keys(model.cells).find(x => newCell.id != model.cells[x].id && model.cells[x].geometry && model.cells[x].geometry.x == geometry.x && model.cells[x].geometry.y == geometry.y); };
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

    //Export to png
    Q('#export').onclick = function () {
        graph.clearSelection();
        var bounds = graph.getGraphBounds();

        var svg = document.querySelector('svg');
        var img = document.createElement('img');
        var img2 = document.createElement('img');
        var canvas = document.createElement('canvas');
        canvas.width = bounds.width;
        canvas.height = bounds.height;

        img.onload = function () {
            canvas.getContext('2d').drawImage(img, -1 * bounds.x, -1 * bounds.y);
            img2.src = canvas.toDataURL('image/png');
            img2.classList.add('export');
            img2.onclick = function () { Q('body').removeChild(img2); };
            Q('body').appendChild(img2);
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

    //Graph events
    graph.getModel().addListener(mxEvent.CHANGE, function () {
        graphToXml();
        xmlToJs();
    });

    function removeAllOverlays() {
        var cells = Object.keys(graph.getModel().cells).map(x => graph.getModel().cells[x]);
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

        if (cells.length === 1 && cell && !(cell.style || '').includes('ellipse')) {
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

    Q('textarea', '#itemTitle').onfocus = function (e) {
        graph.stopEditing();
    };

    Q('textarea', '#itemTitle').onkeyup = function (e) {
        var newValue = graph.getSelectionCell().value = e.target.value;
        graph.getModel().beginUpdate();

        try {
            var cell = graph.getSelectionCell();
            var edit = new mxCellAttributeChange(cell, 'value', newValue);
            graph.getModel().execute(edit);
            //graph.updateCellSize(cell);
        }
        finally {
            graph.getModel().endUpdate();
        }
    };

    Q('[contentEditable]', '#itemDesc').onkeyup = function (e) {
        var cell = graph.getSelectionCell();
        var item = getProcedureItem(cell.id);
        item.contents = Q('[contentEditable]', '#itemDesc').innerHTML;
        showJson();
    };
};