/**
 * TypeScript downlevels `import()` expressions to `require()` when
 * compiling to CommonJS (this app's target — NestJS's default, most-stable
 * mode). That defeats the whole point of using dynamic import to bridge to
 * the ESM-only bundled packages: Node's `require()` doesn't understand the
 * `file://` URLs those bundles need, and throws "Cannot find module
 * 'file:///...'" — confirmed via a live test; the stack trace showed
 * `require()`, not a real `import()`, being called from the compiled
 * output. Hiding the `import()` call inside a `Function` constructor keeps
 * it invisible to TypeScript's static transform, so it survives as a
 * genuine native dynamic import at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const realDynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<unknown>;

export function dynamicImport<T>(specifier: string): Promise<T> {
  return realDynamicImport(specifier) as Promise<T>;
}
