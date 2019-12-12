let ProcedurePlayer = (function () {
    class ProcedurePlayer {
        constructor(el) {
            this.el = el;
            this.start();
        }

        async start() {
            let breadCrumb = [];
            let pointer = null;
            let P = await getJson(`/procedures/procedure1.json`);
            let layout = await getText('/procedureplayer/layout1.html');

            this.el.onclick = e => {
                let cls = [...e.target.classList].filter(x => x.startsWith('goto'))[0];
                if (cls) {
                    navigateToNode(cls.replace('goto', ''));
                    return false;
                }
            };

            const navigateToNode = id => {
                if (id == 0) {
                    breadCrumb = [];
                    pointer = null;
                    setHtml(null, layout);
                    setHtml('.title', P.title);
                    setHtml('.contents', P.contents);
                    setHtml('.edges', `<button class="goto${getEntryNode().id}">Start Procedure</button>`);
                    return;
                }

                /*if (pointer) {
                    breadCrumb[pointer].data = [...this.el.querySelectorAll('[name]')]
                        .map(x => ({ k: x.getAttribute('name'), v: x.value }))
                        .reduce((agg, x) => { agg[x.k] = x.v; return agg; }, {});
                }*/

                let node = P.nodes.filter(x => x.id == id)[0];

                //if (!breadCrumb.includes(node)) {
                    //if (pointer < breadCrumb.length - 1) {
                        //if (!confirm('Weet je het zeker?')) return;
                        //breadCrumb = breadCrumb.slice(0, pointer + 1);
                    //}
                    breadCrumb.push(node.id);
                //}

                let edgesHtml = arrayToHtml(node.edges, x => `<div><button class="goto${x.target}">${x.title || 'Volgende'}</button>${x.contents || ''}</div>`);
                setHtml('.contents', `<h3>${node.title}</h3>${node.contents || ''}`);

                /*if (node.data) {
                    [...this.el.querySelectorAll('[name]')].forEach(x => {
                        x.value = node.data[x.getAttribute('name')];
                    });
                }*/

                setHtml('.edges', edgesHtml || '<b>Einde</b>');

                //pointer = breadCrumb.indexOf(node);

                let crumbHtml = `<ul>
                    <li class="node"><a href="#" class="goto0">${P.title}</a></li>
                    <li class="step">🡓</li>
                    ${breadCrumb.map(x => P.nodes.filter(y => y.id == x)[0]).reduce((agg, x, i) => agg += `
                        <li class="node"><!--a href="#" class="goto${x.id}"-->${x.title}<!--/a--></li>
                        ${breadCrumb[i + 1] ? `<li class="step">🡓 <em>${x.edges.filter(y => y.target == breadCrumb[i + 1])[0].title}</em></li>` : ''}`, '')}
                </ul>`;
                setHtml('.breadcrumb', crumbHtml);
            };

            const setHtml = (sel, html) => (sel ? this.el.querySelector(sel) : this.el).innerHTML = html;
            const getEntryNode = () => {
                let targets = P.nodes.reduce(function (agg, x) { return agg.concat((x.edges || []).map(y => y.target)); }, []);
                return P.nodes.filter(x => !targets.includes(x.id))[0];
            };
            navigateToNode(0);
        }
    }

    //Private methods
    const getJson = async url => await fetch(url).then(r => r.json());
    const getText = async url => await fetch(url).then(r => r.text());
    const arrayToHtml = (arr, func) => (arr || []).reduce((agg, x) => (agg += func(x)), '');

    return ProcedurePlayer;
})();