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

