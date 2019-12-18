function Q(selector, ctx) {
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

function isEmpty(obj) {
    if (!obj) return true;
    if (obj instanceof Array || typeof obj.length != 'undefined') return !obj.length;
}

function createElement(html) {
    if (!html.startsWith('<')) return document.createElement(html);
    let div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild; //Change this to div.childNodes to support multiple top-level nodes
}

function createPopup() {
    var popup = createElement('<div class="popup"></div>');
    var close = createElement('<span class="close">+</span>');
    close.onclick = () => popup.parentNode.removeChild(popup);
    popup.appendChild(close);
    return popup;
}