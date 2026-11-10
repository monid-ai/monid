import ts from "typescript";

/**
 * Closed-term lint: a fn source may reference nothing beyond its own
 * parameters/locals and a small whitelist of pure globals. Free identifiers
 * (module imports, captured closure variables) are compile errors — the engine
 * reinstantiates sources in an empty scope, so capture would silently break.
 *
 * Names resolve lexically (a declaration binds only inside its own scope), and
 * the routes from a whitelisted global to `Function`/module loading
 * (`.constructor`, `.prototype`, `.__proto__`, `import()`) are compile errors.
 */
const GLOBAL_WHITELIST = new Set([
    "undefined",
    "NaN",
    "Infinity",
    "JSON",
    "Math",
    "Object",
    "Array",
    "String",
    "Number",
    "Boolean",
    "Error",
    "TypeError",
    "RangeError",
    // pure URL-escaping primitives (lifecycle fns build wire paths)
    "encodeURIComponent",
    "decodeURIComponent",
    // async lifecycle fns may name it (e.g. Promise.all over utils.http calls)
    "Promise",
]);

const FORBIDDEN_MEMBERS = new Set(["constructor", "prototype", "__proto__"]);

export function lintClosedTerm(canonicalSrc: string, label: string): void {
    const source = ts.createSourceFile(
        "fn.ts",
        `const __fn = (${canonicalSrc});`,
        ts.ScriptTarget.ES2022,
        true,
    );

    const scopes = new Map<ts.Node, Set<string>>();
    const references: ts.Identifier[] = [];
    const violations: string[] = [];

    const isFnScope = (node: ts.Node) =>
        ts.isFunctionLike(node) || ts.isSourceFile(node) ||
        ts.isClassStaticBlockDeclaration(node);
    const isBlockScope = (node: ts.Node) =>
        ts.isBlock(node) || ts.isCaseBlock(node) || ts.isCatchClause(node) ||
        ts.isIterationStatement(node, false) || ts.isSourceFile(node);
    const enclosing = (node: ts.Node, test: (n: ts.Node) => boolean) => {
        let current = node.parent;
        while (!test(current)) current = current.parent;
        return current;
    };
    const bind = (scope: ts.Node, name: ts.BindingName | undefined) => {
        if (!name) return;
        if (ts.isIdentifier(name)) {
            const names = scopes.get(scope) ?? new Set<string>();
            scopes.set(scope, names.add(name.text));
        } else {
            for (const element of name.elements) {
                if (ts.isBindingElement(element)) bind(scope, element.name);
            }
        }
    };

    const isDeclarationName = (node: ts.Identifier): boolean => {
        const parent = node.parent;
        if (
            (ts.isVariableDeclaration(parent) || ts.isParameter(parent) ||
                ts.isBindingElement(parent) ||
                ts.isFunctionDeclaration(parent) ||
                ts.isFunctionExpression(parent) ||
                ts.isClassDeclaration(parent) ||
                ts.isClassExpression(parent)) && parent.name === node
        ) return true;
        return false;
    };

    const isNonReferencePosition = (node: ts.Identifier): boolean => {
        const parent = node.parent;
        // obj.prop — `prop` is not a reference
        if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
            return true;
        }
        // { key: value } — `key` is not a reference (shorthand IS one)
        if (ts.isPropertyAssignment(parent) && parent.name === node) {
            return true;
        }
        if (
            (ts.isMethodDeclaration(parent) || ts.isGetAccessor(parent) ||
                ts.isSetAccessor(parent)) && parent.name === node
        ) return true;
        // ({ apiKey: renamed }) => — the propertyName side of a binding element
        if (ts.isBindingElement(parent) && parent.propertyName === node) {
            return true;
        }
        return false;
    };

    const forbidden = (name: string | undefined) =>
        name !== undefined && FORBIDDEN_MEMBERS.has(name);

    const walk = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node)) {
            bind(
                ts.isCatchClause(node.parent)
                    ? node.parent
                    : ts.getCombinedNodeFlags(node) & ts.NodeFlags.BlockScoped
                    ? enclosing(node, isBlockScope)
                    : enclosing(node, isFnScope),
                node.name,
            );
        } else if (ts.isParameter(node)) {
            bind(node.parent, node.name);
        } else if (
            ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)
        ) {
            bind(enclosing(node, isBlockScope), node.name);
        } else if (
            ts.isFunctionExpression(node) || ts.isClassExpression(node)
        ) {
            bind(node, node.name);
        } else if (
            ts.isPropertyAccessExpression(node) && forbidden(node.name.text)
        ) {
            violations.push(`.${node.name.text}`);
        } else if (
            ts.isElementAccessExpression(node) &&
            ts.isStringLiteralLike(node.argumentExpression) &&
            forbidden(node.argumentExpression.text)
        ) {
            violations.push(`["${node.argumentExpression.text}"]`);
        } else if (ts.isBindingElement(node)) {
            const key = node.propertyName ?? node.name;
            if (
                (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) &&
                forbidden(key.text)
            ) violations.push(`{ ${key.text} }`);
        } else if (
            (ts.isCallExpression(node) &&
                node.expression.kind === ts.SyntaxKind.ImportKeyword) ||
            (ts.isMetaProperty(node) &&
                node.keywordToken === ts.SyntaxKind.ImportKeyword)
        ) {
            violations.push("import");
        }
        if (
            ts.isIdentifier(node) && !isDeclarationName(node) &&
            !isNonReferencePosition(node)
        ) {
            references.push(node);
        }
        ts.forEachChild(node, walk);
    };
    walk(source);

    if (violations.length > 0) {
        throw new Error(
            `${label}: fn reaches for the Function constructor or module loader (${
                [...new Set(violations)].join(", ")
            }) — not allowed in a closed term.`,
        );
    }

    const isBound = (id: ts.Identifier) => {
        for (let n: ts.Node | undefined = id.parent; n; n = n.parent) {
            if (scopes.get(n)?.has(id.text)) return true;
        }
        return false;
    };
    const free = [
        ...new Set(
            references.filter((id) =>
                !GLOBAL_WHITELIST.has(id.text) && !isBound(id)
            ).map((id) => id.text),
        ),
    ];
    if (free.length > 0) {
        throw new Error(
            `${label}: fn is not a closed term — free identifier(s): ${
                free.join(", ")
            }. ` +
                `Fns may reference only their own parameters/locals` +
                ` (and ${[...GLOBAL_WHITELIST].join("/")}).`,
        );
    }
}
