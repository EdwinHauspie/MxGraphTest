/*
TODO

[ON HOLD] printen to image/pdf
veldjes invullen / node selecteren en description invullen
betere icons / hover state
*/

window.onload = () => {
    let M = mxClient;

    //Browser check
    if (!M || !M.isBrowserSupported) {
        alert('mxGraph not found.');
        return;
    }

    if (!M.isBrowserSupported()) {
        alert('Browser not supported.');
        return;
    }

    //Setup and styling of graph and editor
    var container = q('#drawing');
    var config = mxUtils.load('static/mxClient/resources/keyhandler-commons.xml').getDocumentElement();
    var editor = new mxEditor(config);

    (() => {
        editor.setGraphContainer(container);
        window.graph = editor.graph;
        graph.setHtmlLabels(true);
        graph.setPanning(true);
        graph.setConnectable(true);
        graph.setAllowDanglingEdges(false);
        graph.setEdgeLabelsMovable(false);
        graph.setTooltips(false);
        graph.setCellsCloneable(false); //Prevent cloning cells by dragging them while holding down <ctrl>
        mxEvent.disableContextMenu(container);
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
    function q(selector, ctx) {
        let results = [];

        if (selector.nodeType) results.push(selector);
        else if (selector instanceof Array) results = selector;
        else {
            if (!ctx) ctx = window.document;
            else if (typeof ctx === 'string') ctx = window.document.querySelector(ctx);
            results = [].slice.call(ctx.querySelectorAll(selector));
        }

        return results.length === 1 ? results[0] : results;
    }

    function xmlToJson() {
        var doc = mxUtils.parseXml(q('#xml').value.trim());
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
                    geometry: n.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, ''),
                    style: nn.style || null,
                    edges: edgeCells
                        .filter(e => e.getAttribute('source') == n.id)
                        .map(e => {
                            var ee = attributesToObject(e);
                            return {
                                id: ee.id, //.replace(/^_/, ''),
                                title: ee.value || null,
                                target: ee.target, //.replace(/^_/, ''),
                                geometry: e.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, '')
                            };
                        })
                };
            });

        var obj = JSON.parse(q('#json').value || '{ "nodes": [] }');
        obj.title = q('textarea', '#procTitle').value;
        obj.contents = q('[contentEditable]', '#procDesc').innerHTML;
        obj.nodes = nodes;
        q('#json').value = JSON.stringify(obj, (key, value) => { if (value !== null) return value }, '    ');
    }

    q('#xmlToJson').onclick = xmlToJson;

    //Convert json to xml
    function randomId() {
        var c = 'abcdefghijklmnopqrstuvwxyz'.split('');
        return c.map(x => c[Math.floor(Math.random() * 26)]).join('');
    }

    /*var nodeGeometry = '<mxGeometry x="40" y="40" width="140" height="80" as="geometry"/>';
    var startGeometry = '<mxGeometry x="40" y="40" width="50" height="50" as="geometry"/>';
    var endGeometry = '<mxGeometry x="40" y="40" width="50" height="50" as="geometry"/>';
    var edgeGeometry = '<mxGeometry relative="1" as="geometry"/>';*/
    var startStyle = 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#66CC00;';
    var endStyle = 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#FF6666;';

    function jsonToXml() {
        var obj = JSON.parse(q('#json').value);
        var xml = '';

        function restoreLineBreaks(val) {
            return val.replace('\n', '&#xa;');
        }

        (obj.nodes || obj).forEach(n => {
            xml += `<mxCell id="${n.id}" value="${restoreLineBreaks(n.title || '')}" style="${n.style || ''}" parent="1" vertex="1">${n.geometry}</mxCell>`;
            (n.edges || []).forEach(e => (xml += `<mxCell id="${e.id || randomId()}" value="${restoreLineBreaks(e.title || '')}" parent="1" source="${n.id}" target="${e.target}" edge="1">${e.geometry}</mxCell>`));
        });

        var doc = mxUtils.parseXml(`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml}</root></mxGraphModel>`);
        q('#xml').value = mxUtils.getPrettyXml(doc.documentElement, '    ', '');
        q('textarea', '#procTitle').value = obj.title;
        q('[contentEditable]', '#procDesc').innerHTML = obj.contents;
    }

    q('#jsonToXml').onclick = jsonToXml;

    //Auto arrange
    q('#vertical').onclick = function () {
        var layout = new mxHierarchicalLayout(graph);
        layout.execute(graph.getDefaultParent());
    };

    q('#horizontal').onclick = function () {
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);
        layout.execute(graph.getDefaultParent());
    };

    q('#organic').onclick = function () {
        var layout = new mxFastOrganicLayout(graph);
        layout.forceConstant = 120;
        layout.execute(graph.getDefaultParent());
    };

    //Convert graph to xml
    function graphToXml() {
        var encoder = new mxCodec();
        var node = encoder.encode(graph.getModel());
        q('#xml').value = mxUtils.getPrettyXml(node, '    ', '');
    }

    q('#graphToXml').onclick = graphToXml;

    //Convert xml to graph
    function xmlToGraph() {
        var doc = mxUtils.parseXml(q('#xml').value);
        var dec = new mxCodec(doc);
        dec.decode(doc.documentElement, editor.graph.getModel());

        (graph.getModel().getRoot().children[0].children || []).forEach(v => {
            if (v.vertex) addOverlays(graph, v);
            //if (v.id == '_start') v.setConnectable(false);
            //if (v.id == '_end') v.setConnectable(false);
        });
    }

    q('#xmlToGraph').onclick = xmlToGraph;

    //Load and save json
    q('#loadJson').onclick = async function () {
        var proc = await fetch(`static/procedureplayer/procedure3.json`).then(r => r.json());
        q('#json').value = JSON.stringify(proc, null, '    ');
        jsonToXml();
        xmlToGraph();
    };

    q('#saveJson').onclick = async function () {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(q('#json').value));
        element.setAttribute('download', 'procedure1.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    /*$('#vertex').onclick = async function () {
        var v = graph.insertVertex(graph.getDefaultParent(), null, 'Nieuwe stap', 10, 10, 140, 80);
        addOverlays(graph, v);
    };*/

    //Panel enlarge
    q('.enlarge').forEach(x => x.onclick = function (e) {
        if (e.target.closest('.luik').style.flex.startsWith('1')) {
            q('.luik').forEach(x => x.style.flex = 1)
            e.target.closest('.luik').style.flex = 3;
        }
    });

    //Drag a new node
    var afterDrag1 = function (graph, evt, target, x, y) {
        var cell = new mxCell('Nieuwe stap', new mxGeometry(0, 0, 140, 80));
        cell.vertex = true;
        var cells = graph.importCells([cell], x, y, target);
        addOverlays(graph, cells[0]);

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

    var dragSource1 = mxUtils.makeDraggable(q('#newNode'), () => graph, afterDrag1, dragEl1, null, null, graph.autoscroll, true);
    dragSource1.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var afterDrag2 = function (graph, evt, target, x, y) {
        var cell = new mxCell(null, new mxGeometry(0, 0, 50, 50));
        cell.vertex = true;
        cell.style = startStyle;
        var cells = graph.importCells([cell], x, y, target);
        addOverlays(graph, cells[0]);

        if (cells != null && cells.length > 0) {
            graph.scrollCellToVisible(cells[0]);
            graph.setSelectionCells(cells);
        }
    };

    var afterDrag3 = function (graph, evt, target, x, y) {
        var cell = new mxCell(null, new mxGeometry(0, 0, 50, 50));
        cell.vertex = true;
        cell.style = endStyle;
        var cells = graph.importCells([cell], x, y, target);
        addOverlays(graph, cells[0]);

        if (cells != null && cells.length > 0) {
            graph.scrollCellToVisible(cells[0]);
            graph.setSelectionCells(cells);
        }
    };

    var dragEl2 = document.createElement('div');
    dragEl2.style.border = 'dashed grey 2px';
    dragEl2.style.width = '50px';
    dragEl2.style.height = '50px';
    dragEl2.style.borderRadius = '50px';

    var dragSource2 = mxUtils.makeDraggable(q('#newStart'), () => graph, afterDrag2, dragEl2, null, null, graph.autoscroll, true);
    dragSource2.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    var dragSource3 = mxUtils.makeDraggable(q('#newEnd'), () => graph, afterDrag3, dragEl2, null, null, graph.autoscroll, true);
    dragSource3.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

    function addOverlays(graph, cell) {
        if (cell.id == '_start') return;
        if (cell.id == '_end') return;

        var overlay = new mxCellOverlay(new mxImage('static/mxClient/resources/add.png', 16, 16), 'Nieuwe stap');
        overlay.cursor = 'hand';
        overlay.align = mxConstants.ALIGN_RIGHT;
        overlay.offset = new mxPoint(-12, -12);
        overlay.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { addChild(graph, cell); }));
        graph.addCellOverlay(cell, overlay);

        overlay = new mxCellOverlay(new mxImage('static/mxClient/resources/delete.png', 16, 16), 'Verwijderen');
        overlay.cursor = 'hand';
        overlay.offset = new mxPoint(-12, 14);
        overlay.align = mxConstants.ALIGN_RIGHT;
        overlay.verticalAlign = mxConstants.ALIGN_TOP;
        overlay.addListener(mxEvent.CLICK, mxUtils.bind(this, function (sender, evt) { deleteSubtree(graph, cell); }));
        graph.addCellOverlay(cell, overlay);
    }

    function addChild(graph, cell) {
        var model = graph.getModel();
        var parent = graph.getDefaultParent();

        try {
            model.beginUpdate();
            var vertex = graph.insertVertex(parent, null, 'Nieuwe stap');
            var geometry = model.getGeometry(vertex);
            geometry.x = cell.geometry.x;
            geometry.y = cell.geometry.y + cell.geometry.height + 80;
            geometry.width = 140;
            geometry.height = 80;
            graph.insertEdge(parent, null, 'Nieuwe keuze', cell, vertex);
            addOverlays(graph, vertex, true);
        }
        finally {
            model.endUpdate();
        }
    }

    function deleteSubtree(graph, cell) {
        var cells = [];
        graph.traverse(cell, true, function (vertex) {
            cells.push(vertex);
            return true;
        });

        if (confirm('Dit item en eventueel onderliggende items worden verwijderd.\nWeet je het zeker?'))
            graph.removeCells(cells);
    }

    //Selection / change fields
    graph.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
        var cells = graph.getSelectionCells();
        var cell = cells[0];

        if (cells.length === 1 && cell && !(cell.style || '').includes('ellipse')) {
            q('#itemTitle').style.display = '';
            q('#itemDesc').style.display = '';
            q('textarea', '#itemTitle').value = cell.value;
        }
        else {
            q('#itemTitle').style.display = 'none';
            q('#itemDesc').style.display = 'none';
        }
    });

    q('textarea', '#itemTitle').onfocus = function(e) {
        graph.stopEditing();
    };

    q('textarea', '#itemTitle').onkeyup = function (e) {
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

    q('[contentEditable]', '#itemDesc').onkeyup = function(e) {
        var cell = graph.getSelectionCell();
        console.log(cell);
        cell.setAttribute('test', '123');
    };
};