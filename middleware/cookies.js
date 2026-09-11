function lerCookies(header = "") {
    const cookies = {};
    for (const parte of String(header).split(";")) {
        const indice = parte.indexOf("=");
        if (indice < 1) continue;
        const chave = parte.slice(0, indice).trim();
        const valor = parte.slice(indice + 1).trim();
        try { cookies[chave] = decodeURIComponent(valor); }
        catch { cookies[chave] = valor; }
    }
    return cookies;
}

function cookieSessao(nome, token, { secure = false, maxAgeSeconds = 28800 } = {}) {
    const partes = [
        `${nome}=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
    ];
    if (secure) partes.push("Secure");
    return partes.join("; ");
}

function limparCookie(nome, { secure = false } = {}) {
    const partes = [`${nome}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
    if (secure) partes.push("Secure");
    return partes.join("; ");
}

module.exports = { lerCookies, cookieSessao, limparCookie };
