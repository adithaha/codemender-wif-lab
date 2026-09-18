const adminService = require('../../services/admin.service');

function evaluateExpression(expr) {
    if (typeof expr === 'number') {
        if (!Number.isFinite(expr)) throw new Error('Invalid number');
        return expr;
    }
    if (typeof expr !== 'string') throw new Error('Invalid expression');
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if ((ch >= '0' && ch <= '9') || ch === '.') {
            let numStr = '';
            while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
                numStr += expr[i];
                i++;
            }
            if (numStr === '.' || (numStr.match(/\./g) || []).length > 1) {
                throw new Error('Invalid number format');
            }
            tokens.push({ type: 'number', value: parseFloat(numStr) });
            continue;
        }
        if ('+-*/%()'.includes(ch)) {
            tokens.push({ type: 'op', value: ch });
            i++;
            continue;
        }
        throw new Error('Invalid character: ' + ch);
    }
    if (tokens.length === 0) throw new Error('Empty expression');
    let pos = 0;
    function get() { return tokens[pos++]; }
    function parseExpression() {
        let left = parseTerm();
        while (pos < tokens.length && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
            const op = get().value;
            const right = parseTerm();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }
    function parseTerm() {
        let left = parseFactor();
        while (pos < tokens.length && (tokens[pos].value === '*' || tokens[pos].value === '/' || tokens[pos].value === '%')) {
            const op = get().value;
            const right = parseFactor();
            if (op === '*') left *= right;
            else if (op === '/') {
                if (right === 0) throw new Error('Division by zero');
                left /= right;
            } else if (op === '%') {
                if (right === 0) throw new Error('Division by zero');
                left %= right;
            }
        }
        return left;
    }
    function parseFactor() {
        if (pos < tokens.length && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
            const op = get().value;
            const val = parseFactor();
            return op === '-' ? -val : val;
        }
        return parsePrimary();
    }
    function parsePrimary() {
        const token = get();
        if (!token) throw new Error('Unexpected end of expression');
        if (token.type === 'number') return token.value;
        if (token.value === '(') {
            const val = parseExpression();
            const close = get();
            if (!close || close.value !== ')') throw new Error('Missing closing parenthesis');
            return val;
        }
        throw new Error('Unexpected token: ' + token.value);
    }
    const result = parseExpression();
    if (pos < tokens.length) throw new Error('Unexpected token at end');
    if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Invalid calculation');
    return result;
}

exports.checkShippingStatus = (req, res) => {
    adminService.pingProvider(req.body.providerIP, req.body.options, out => res.send(out));
};

exports.previewDynamicPricing = (req, res) => {
    try {
        if (!req.body || req.body.formula === undefined) {
            return res.status(400).send("Evaluation Failed");
        }
        res.json({ price: evaluateExpression(req.body.formula) });
    } catch (e) {
        res.status(400).send("Evaluation Failed");
    }
};
