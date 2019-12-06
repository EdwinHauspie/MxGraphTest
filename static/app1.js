window.onload = () => {
    let M = mxClient;

    //Browser checks
    if (!M || !M.isBrowserSupported) {
        alert('mxGraph not found.');
        return;
    }

    if (!M.isBrowserSupported()) {
        alert('Browser not supported.');
        return;
    }

    //Graph and editor setup
    var container = document.getElementById('drawing');
    var config = mxUtils.load('static/mxClient/resources/keyhandler-commons.xml').getDocumentElement();
    var editor = new mxEditor(config);
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

    //Default styling
    (() => {
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
        graph.getStylesheet().putDefaultVertexStyle(style);
    })();

    /*graph.convertValueToString = function (cell) {
        if (mxUtils.isNode(cell.value)) {
            if (cell.value.nodeName.toLowerCase() == 'person') {
                var firstName = cell.getAttribute('firstName', '');
                var lastName = cell.getAttribute('lastName', '');

                if (lastName != null && lastName.length > 0) {
                    return lastName + ', ' + firstName;
                }

                return firstName;
            }
            else if (cell.value.nodeName.toLowerCase() == 'knows') {
                return cell.value.nodeName + ' (Since '
                    + cell.getAttribute('since', '') + ')';
            }

        }

        return '';
    };*/

    /*try {
        model.beginUpdate();
        var parent = graph.getDefaultParent();
        var defaultSize = { w: 140, h: 80 };
        var v1 = graph.insertVertex(parent, null, 'Gebeurt de doorzoeking op heterdaad?', 40, 40, defaultSize.w, defaultSize.h);
        var v2 = graph.insertVertex(parent, null, 'Geeft de eigenaar toestemming?', 320, 200, defaultSize.w, defaultSize.h);
        var v3 = graph.insertVertex(parent, null, 'Je moet niks doen.', 40, 360, defaultSize.w, defaultSize.h);
        addOverlays(graph, v1);
        addOverlays(graph, v2);
        addOverlays(graph, v3);
        graph.insertEdge(parent, null, 'Ja', v1, v2);
        graph.insertEdge(parent, null, 'Neen', v1, v3);
    }
    finally {
        model.endUpdate();
    }*/

    document.getElementById('fromXml').onclick = function () {
        var doc = mxUtils.parseXml(document.getElementById('xml').value.trim());
        var cells = [...doc.documentElement.getElementsByTagName('mxCell')];
        var nodeCells = cells.filter(c => c.getAttribute('vertex'));
        var edgeCells = cells.filter(c => c.getAttribute('edge'));
        var attributesToObject = function (el) {
            return el ? [...el.attributes]
                .map(y => ({ k: y.name, v: y.value }))
                .reduce((agg, z) => { agg[z.k] = z.v; return agg; }, {})
                : null;
        };

        var nodes = nodeCells
            .map(n => {
                var nn = attributesToObject(n);
                return {
                    id: nn.id.replace(/^_/, ''),
                    start: nn.id == '_start' ? true : null,
                    end: nn.id == '_end' ? true : null,
                    title: nn.value || null,
                    geometry: n.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, ''),
                    edges: edgeCells
                        .filter(e => e.getAttribute('source') == n.id)
                        .map(e => {
                            var ee = attributesToObject(e);
                            return {
                                id: ee.id.replace(/^_/, ''),
                                title: ee.value || null,
                                target: ee.target.replace(/^_/, ''),
                                geometry: e.getElementsByTagName('mxGeometry')[0].outerHTML.replace(/\n\s*/g, '')
                            };
                        })
                };
            });

        var obj = JSON.parse(document.getElementById('json').value);
                if (obj.nodes) obj.nodes = nodes;
        else obj = nodes;
        document.getElementById('json').value = JSON.stringify(obj, (key, value) => { if (value !== null) return value }, '    ');
    };

    function randomId() {
        var c = 'abcdefghijklmnopqrstuvwxyz'.split('');
        return c.map(x => c[Math.floor(Math.random() * 26)]).join('');
    }

    document.getElementById('toXml').onclick = function () {
        var obj = JSON.parse(document.getElementById('json').value);
        var xml = '';

        var nodeGeometry = '<mxGeometry x="40" y="40" width="140" height="80" as="geometry"/>';
        var startGeometry = '<mxGeometry x="40" y="40" width="50" height="50" as="geometry"/>';
        var endGeometry = '<mxGeometry x="40" y="40" width="50" height="50" as="geometry"/>';
        var nodeStyle = '';
        var startStyle = 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#66CC00;';
        var endStyle = 'editable=0;resizable=0;shape=ellipse;perimeter=ellipsePerimeter;strokeWidth=2;strokeColor=#FF6666;';

        function getNodeStyle(n) {
            if (n.start) return startStyle;
            if (n.end) return endStyle;
            return nodeStyle;
        }

        function getNodeGeometry(n) {
            if (n.geometry) return n.geometry;
            if (n.start) return startGeometry;
            if (n.end) return endGeometry;
            return nodeGeometry;
        }

        (obj.nodes || obj).forEach(n => {
            xml += `<mxCell id="_${n.id}" value="${n.title || ''}" style="${getNodeStyle(n)}" parent="1" vertex="1">
                ${getNodeGeometry(n)}
            </mxCell>`;

            (n.edges || []).forEach(e => {
                xml += `<mxCell id="_${e.id || randomId()}" value="${e.title || ''}" parent="1" source="_${n.id}" target="_${e.target}" edge="1">
                    ${e.geometry || '<mxGeometry relative="1" as="geometry"/>'}
                </mxCell>`;
            });
        });

        var doc = mxUtils.parseXml(`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml}</root></mxGraphModel>`);
        document.getElementById('xml').value = mxUtils.getPrettyXml(doc.documentElement, '    ', '');
    };

    //Auto arrange
    document.getElementById('vertical').onclick = function () {
        var layout = new mxHierarchicalLayout(graph);
        layout.execute(graph.getDefaultParent());
    };

    document.getElementById('horizontal').onclick = function () {
        var layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);
        layout.execute(graph.getDefaultParent());
    };

    document.getElementById('organic').onclick = function () {
        var layout = new mxFastOrganicLayout(graph);
        layout.forceConstant = 120;
        layout.execute(graph.getDefaultParent());
    };

    //Convert xml to grah
    document.getElementById('fromGraph').onclick = function () {
        var encoder = new mxCodec();
        var node = encoder.encode(graph.getModel());
        document.getElementById('xml').value = mxUtils.getPrettyXml(node, '    ', '');
    };

    //Convert graph to xml
    document.getElementById('toGraph').onclick = function () {
        var doc = mxUtils.parseXml(document.getElementById('xml').value);
        var dec = new mxCodec(doc);
        dec.decode(doc.documentElement, editor.graph.getModel());

        (graph.getModel().getRoot().children[0].children || []).forEach(v => {
            if (v.vertex) addOverlays(graph, v);
            //if (v.id == '_start') v.setConnectable(false);
            //if (v.id == '_end') v.setConnectable(false);
        });
    };

    document.getElementById('load').onclick = async function () {
        var proc = await fetch(`static/procedureplayer/procedure3.json`).then(r => r.json());
        document.getElementById('json').value = JSON.stringify(proc, null, '    ');
        document.getElementById('toXml').click();
        document.getElementById('toGraph').click();
        //document.getElementById('vertical').click();
    };

    document.getElementById('save').onclick = async function () {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById('json').value));
        element.setAttribute('download', 'procedure1.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    /*document.getElementById('vertex').onclick = async function () {
        var v = graph.insertVertex(graph.getDefaultParent(), null, 'Nieuwe stap', 10, 10, 140, 80);
        addOverlays(graph, v);
    };*/

    document.querySelectorAll('.enlarge').forEach(x => x.onclick = function (e) {
        if (e.target.closest('.luik').style.flex.includes('.6')) {
            document.querySelectorAll('.luik').forEach(x => x.style.flex = .3333)
        }
        else {
            document.querySelectorAll('.luik').forEach(x => x.style.flex = .2)
            e.target.closest('.luik').style.flex = .6;
        }
    });

    //Drag a new node
    var afterDrag = function (graph, evt, target, x, y) {
        var cell = new mxCell('Nieuwe stap', new mxGeometry(0, 0, 140, 80));
        cell.vertex = true;
        var cells = graph.importCells([cell], x, y, target);
        addOverlays(graph, cells[0]);

        if (cells != null && cells.length > 0) {
            graph.scrollCellToVisible(cells[0]);
            graph.setSelectionCells(cells);
        }
    };

    var dragEl = document.createElement('div');
    dragEl.style.border = 'dashed black 1px';
    dragEl.style.width = '140px';
    dragEl.style.height = '80px';
    dragEl.style.borderRadius = '10px';

    var dragSource = mxUtils.makeDraggable(document.getElementById('newNode'), () => graph, afterDrag, dragEl, null, null, graph.autoscroll, true);
    dragSource.isGuidesEnabled = function () { return graph.graphHandler.guidesEnabled; };

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

        if (cells.length > 1) {
            if (confirm('Deze stap en de onderliggende stappen worden verwijderd.\nWeet je het zeker?'))
                graph.removeCells(cells);
        }
        else graph.removeCells(cells);
    }
};