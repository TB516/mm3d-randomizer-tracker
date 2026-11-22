/**
 * Converts the MM3D Randomizer generator's logic into TypeScript for the tracker.
 *
 * Usage: `node scripts/convert-logic.mts <path to an MM3D_Randomizer checkout>`. The checkout needs
 * its `Z3DR` submodule (`git submodule update --init`).
 *
 * Writes `src/main/logic/generated/`: every area with its events, locations, and exits, the item
 * and location tables, and the generator's license. Rerun it when the randomizer updates.
 */
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Console, Effect, FileSystem, Path, Schema } from 'effect';
import { Argument, Command } from 'effect/cli';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { Language, type Node, Parser } from 'web-tree-sitter';

/** The generator's source has something the converter doesn't know how to read. */
class UnrecognizedSource extends Schema.TaggedError<UnrecognizedSource>()('UnrecognizedSource', {
  message: Schema.String
}) {}

/**
 * Builds the error for a node the converter doesn't expect.
 *
 * @param what - What the converter was reading.
 * @param node - The node, if there was one.
 * @returns The error.
 */
const unexpected = (what: string, node: Node | null | undefined) =>
  new UnrecognizedSource({
    message: `Unexpected ${what}: ${node ? `${node.type} at line ${node.startPosition.row + 1}: ${node.text.slice(0, 120)}` : 'nothing'}`
  });

const outputDirectory = '../src/main/logic/generated';

/** Settings the rules read directly. */
const settings = new Set(['SkipBombersMinigame']);

/** Functions the rules call, all hand-ported next to the generated files. */
const functions = new Set([
  'CanUse',
  'CanPlay',
  'SmallKeys',
  'TotalHeartContainers',
  'TotalMaskCount',
  'StrayFairyCount',
  'SkulltulaCount',
  'ZoraEggCount'
]);

/** C++ operators that read differently in TypeScript. */
const operators: Record<string, string> = { '==': '===', '!=': '!==' };

/**
 * The override type each kind of location uses, as `ItemLocation::Key` sets it. Other kinds keep
 * the default 0.
 */
const overrideTypes: Record<string, number> = {
  Base: 0,
  Chest: 1,
  Collectable: 2,
  OGSToken: 3,
  SGSToken: 3,
  GrottoScrub: 4,
  Delayed: 5,
  TempleReward: 6
};

type Item = { readonly name: string; readonly variable: string | null; readonly getItemId: number };
type Location = {
  readonly name: string;
  readonly vanillaItem: string | null;
  readonly overrideKey: string;
};
type Entry = { readonly target: string; readonly rule: string };
type Area = {
  readonly key: string;
  readonly name: string;
  readonly events: ReadonlyArray<Entry>;
  readonly locations: ReadonlyArray<Entry>;
  readonly exits: ReadonlyArray<Entry>;
};

// ---- Reading the syntax tree ----

/**
 * A node's named children, without comments.
 *
 * @param node - The node.
 * @returns Its children.
 */
const childrenOf = (node: Node | null | undefined) =>
  node?.namedChildren.filter((child) => child.type !== 'comment') ?? [];

/**
 * Finds each `table[KEY] = Call(...)` assignment, which is how the generator fills its tables.
 *
 * @param root - The file's syntax tree.
 * @param table - The table's name.
 * @returns Each entry's key, the called function's name, and its arguments.
 */
const findTableEntries = (root: Node, table: string) =>
  root.descendantsOfType('assignment_expression').flatMap((assignment) => {
    const target = assignment.childForFieldName('left');
    const value = assignment.childForFieldName('right');
    if (
      target?.childForFieldName('argument')?.text !== table ||
      value?.type !== 'call_expression'
    ) {
      return [];
    }

    const [key] = childrenOf(target.childForFieldName('indices'));
    const callee = value.childForFieldName('function');
    const args = childrenOf(value.childForFieldName('arguments'));
    return key && callee ? [{ key: key.text, callee, args }] : [];
  });

/**
 * Reads a C++ string literal.
 *
 * @param node - The literal.
 * @returns Its text.
 */
const readString = Effect.fnUntraced(function* (node: Node | undefined) {
  if (node?.type !== 'string_literal') return yield* unexpected('string', node);

  // The generator's names only escape quotes and backslashes.
  return node.text.slice(1, -1).replace(/\\(.)/g, '$1');
});

/**
 * Reads every logic variable from the definitions in `logic.cpp`'s namespace.
 *
 * @param root - `logic.cpp`'s syntax tree.
 * @returns Each variable, and whether it's a flag (`bool`) or a count (`u8`).
 */
const readVariables = (root: Node) => {
  const variables = new Map<string, 'flag' | 'count'>();
  const declarations = root
    .descendantsOfType('declaration')
    .filter((declaration) => declaration.parent?.type === 'declaration_list');

  for (const declaration of declarations) {
    const type = declaration.childForFieldName('type')?.text;
    if (type !== 'bool' && type !== 'u8') continue;

    for (const declarator of declaration.childrenForFieldName('declarator')) {
      const name = declarator.childForFieldName('declarator')?.text ?? declarator.text;
      variables.set(name, type === 'bool' ? 'flag' : 'count');
    }
  }

  return variables;
};

/**
 * Reads the game's get-item IDs from mm3dr's `GetItemID` enum.
 *
 * @param root - `item_override.h`'s syntax tree.
 * @returns Each ID by its name.
 */
const readGetItemIds = Effect.fnUntraced(function* (root: Node) {
  const enumeration = root
    .descendantsOfType('enum_specifier')
    .find((node) => node.childForFieldName('name')?.text === 'GetItemID');
  if (!enumeration) return yield* unexpected('GetItemID enum', null);

  const ids = new Map<string, number>();
  let next = 0;
  for (const enumerator of childrenOf(enumeration.childForFieldName('body'))) {
    const name = enumerator.childForFieldName('name')?.text;
    const value = enumerator.childForFieldName('value');
    if (!name) return yield* unexpected('enumerator', enumerator);

    if (value) next = Number(value.text);
    ids.set(name, next++);
  }

  return ids;
});

/**
 * Reads an item's get-item ID, written as `GetItemID::GI_...` or a number, either maybe cast.
 *
 * @param node - The argument.
 * @param getItemIds - The IDs by name.
 * @returns The ID.
 */
const readGetItemId = Effect.fnUntraced(function* (
  node: Node | undefined,
  getItemIds: ReadonlyMap<string, number>
) {
  const value = node?.type === 'cast_expression' ? node.childForFieldName('value') : node;

  if (value?.type === 'number_literal') return Number(value.text);
  const id = getItemIds.get(value?.childForFieldName('name')?.text ?? '');
  if (value?.type !== 'qualified_identifier' || id === undefined) {
    return yield* unexpected('get-item ID', node);
  }

  return id;
});

/**
 * Reads the item table.
 *
 * @param root - `item_list.cpp`'s syntax tree.
 * @param variables - Every logic variable.
 * @param getItemIds - The game's get-item IDs.
 * @returns Each item by its key.
 */
const readItems = Effect.fnUntraced(function* (
  root: Node,
  variables: ReadonlyMap<string, unknown>,
  getItemIds: ReadonlyMap<string, number>
) {
  const items = new Map<string, Item>();

  for (const { key, args } of findTableEntries(root, 'itemTable')) {
    // The table starts with an empty placeholder item.
    if (args.length === 0) continue;

    // Item(advancement, reusable, &variable, Text{names...}, hint key, get-item ID, type)
    const [, , pointer, text, , getItemId] = args;
    const variable = pointer?.childForFieldName('argument')?.text ?? '';
    if (!variables.has(variable)) return yield* unexpected('item variable', pointer);

    const names = childrenOf(text?.childForFieldName('value'));
    items.set(key, {
      name: yield* readString(names[0]),
      variable: variable === 'noVariable' ? null : variable,
      getItemId: yield* readGetItemId(getItemId, getItemIds)
    });
  }

  return items;
});

/**
 * Reads the location table.
 *
 * @param root - `item_location.cpp`'s syntax tree.
 * @param items - Every item.
 * @returns Each location by its key.
 */
const readLocations = Effect.fnUntraced(function* (root: Node, items: ReadonlyMap<string, Item>) {
  const locations = new Map<string, Location>();

  for (const { key, callee, args } of findTableEntries(root, 'locationTable')) {
    // ItemLocation::Kind(scene, flag, ..., "name", key, vanilla item, ...)
    const kind = callee.childForFieldName('name')?.text ?? '';
    const [scene, flag] = args.map((arg) => Number(arg.text));
    const nameIndex = args.findIndex((arg) => arg.type === 'string_literal');
    const name = yield* readString(args[nameIndex]);

    // Gossip stones give hints, not items.
    const vanillaItem = kind === 'HintStone' ? 'NONE' : (args[nameIndex + 2]?.text ?? '');
    if (vanillaItem !== 'NONE' && !items.has(vanillaItem)) {
      return yield* unexpected('vanilla item', args[nameIndex + 2]);
    }

    locations.set(key, {
      name,
      vanillaItem: vanillaItem === 'NONE' ? null : vanillaItem,
      overrideKey: `${scene} ${overrideTypes[kind] ?? 0} ${flag}`
    });
  }

  return locations;
});

// ---- Converting rules ----

/**
 * Turns a rule's C++ expression into TypeScript, reading every variable from `has`.
 *
 * @param node - The expression.
 * @param names - Every logic variable and item.
 * @returns The same expression in TypeScript.
 */
const convertRule: (
  node: Node | null,
  names: { variables: ReadonlyMap<string, unknown>; items: ReadonlyMap<string, unknown> }
) => Effect.Effect<string, UnrecognizedSource> = Effect.fnUntraced(function* (node, names) {
  switch (node?.type) {
    case 'true':
    case 'false':
    case 'number_literal':
      return node.text;

    case 'identifier': {
      if (!names.variables.has(node.text) && !settings.has(node.text)) {
        return yield* unexpected('name in a rule', node);
      }
      return `has.${node.text}`;
    }

    case 'parenthesized_expression':
      return `(${yield* convertRule(childrenOf(node)[0] ?? null, names)})`;

    case 'unary_expression': {
      const operator = node.childForFieldName('operator')?.text;
      if (operator !== '!') return yield* unexpected('operator', node);
      return `!${yield* convertRule(node.childForFieldName('argument'), names)}`;
    }

    case 'binary_expression': {
      const left = yield* convertRule(node.childForFieldName('left'), names);
      const right = yield* convertRule(node.childForFieldName('right'), names);
      const operator = node.childForFieldName('operator')?.text ?? '';
      return `${left} ${operators[operator] ?? operator} ${right}`;
    }

    case 'call_expression': {
      const name = node.childForFieldName('function')?.text ?? '';
      if (!functions.has(name)) return yield* unexpected('function in a rule', node);

      // Items are passed by key, like CanUse(FIRE_ARROWS).
      const args = yield* Effect.forEach(childrenOf(node.childForFieldName('arguments')), (arg) =>
        names.items.has(arg.text) ? Effect.succeed(`'${arg.text}'`) : convertRule(arg, names)
      );
      return `has.${name}(${args.join(', ')})`;
    }

    default:
      return yield* unexpected('expression in a rule', node);
  }
});

/**
 * Reads an `EventAccess`, `LocationAccess`, or `Entrance` entry: a target, then a lambda that
 * returns the rule.
 *
 * @param entry - The entry's call.
 * @param kind - The call it should be.
 * @param names - Every logic variable and item.
 * @returns What it unlocks and its rule as TypeScript.
 */
const readEntry = Effect.fnUntraced(function* (
  entry: Node,
  kind: string,
  names: Parameters<typeof convertRule>[1]
) {
  const [target, conditions, ...rest] = childrenOf(entry.childForFieldName('arguments'));
  const [lambda] = childrenOf(conditions);
  const [statement] = childrenOf(lambda?.childForFieldName('body'));
  if (entry.childForFieldName('function')?.text !== kind || rest.length > 0) {
    return yield* unexpected(kind, entry);
  }
  if (statement?.type !== 'return_statement') return yield* unexpected('rule', lambda);

  // Events point at their variable, like &OldLadySaved.
  const targetName =
    target?.type === 'pointer_expression' ? target.childForFieldName('argument') : target;
  return {
    target: targetName?.text ?? '',
    rule: yield* convertRule(childrenOf(statement)[0] ?? null, names)
  };
});

/**
 * Reads every area.
 *
 * @param root - `location_access.cpp`'s syntax tree.
 * @param names - Every logic variable and item.
 * @returns Each area.
 */
const readAreas = Effect.fnUntraced(function* (
  root: Node,
  names: Parameters<typeof convertRule>[1]
) {
  const readEntries = (list: Node | undefined, kind: string) =>
    Effect.forEach(childrenOf(list), (entry) => readEntry(entry, kind, names));

  // Area(name, scene, hint key, {events}, {locations}, {exits})
  return yield* Effect.forEach(findTableEntries(root, 'areaTable'), ({ key, args }) =>
    Effect.gen(function* () {
      const area: Area = {
        key,
        name: yield* readString(args[0]),
        events: yield* readEntries(args[3], 'EventAccess'),
        locations: yield* readEntries(args[4], 'LocationAccess'),
        exits: yield* readEntries(args[5], 'Entrance')
      };
      return area;
    })
  );
});

// ---- Writing TypeScript ----

const quote = (text: string) => JSON.stringify(text);

/**
 * Writes a list of rule entries as TypeScript.
 *
 * @param entries - The entries.
 * @param field - What each entry's target is called.
 * @param toValue - Turns a target into its TypeScript value.
 * @returns The array's source.
 */
const writeEntries = (
  entries: ReadonlyArray<Entry>,
  field: string,
  toValue: (target: string) => string
) =>
  `[${entries
    .map(({ target, rule }) => {
      const parameter = rule.includes('has.') ? 'has' : '';
      return `{ ${field}: ${toValue(target)}, rule: (${parameter}) => ${rule} }`;
    })
    .join(', ')}]`;

/**
 * Writes the rules file.
 *
 * @param header - The generated-file comment.
 * @param areas - Every area.
 * @param locations - Every location, for their names.
 * @returns The file's source.
 */
const writeRulesFile = (
  header: string,
  areas: ReadonlyArray<Area>,
  locations: ReadonlyMap<string, Location>
) => `${header}

import type { Area } from '../engine';

/** Every area, keyed by the generator's area key. \`ROOT\` is where the search starts. */
export const areas = {
${areas
  .map(
    (area) => `  ${area.key}: {
    name: ${quote(area.name)},
    events: ${writeEntries(area.events, 'event', quote)},
    locations: ${writeEntries(area.locations, 'location', (key) => quote(locations.get(key)?.name ?? ''))},
    exits: ${writeEntries(area.exits, 'to', quote)}
  }`
  )
  .join(',\n')}
} satisfies Record<string, Area>;
`;

/**
 * Writes the items file: logic variables, items, and locations.
 *
 * @param header - The generated-file comment.
 * @param variables - Every logic variable.
 * @param items - Every item.
 * @param locations - Every location.
 * @returns The file's source.
 */
const writeItemsFile = (
  header: string,
  variables: ReadonlyMap<string, 'flag' | 'count'>,
  items: ReadonlyMap<string, Item>,
  locations: ReadonlyMap<string, Location>
) => {
  // Some locations share an override key, like every stray fairy in a temple, so the patch only
  // holds one item for all of them. Only a key that's unique says what its location holds.
  const keyUses = new Map<string, number>();
  for (const { overrideKey } of locations.values()) {
    keyUses.set(overrideKey, (keyUses.get(overrideKey) ?? 0) + 1);
  }

  // Overrides name items by get-item ID. A few IDs are shared by items that set different
  // variables, like the magic bean and the bean pack, so those can't say which item it is.
  const itemsByGetItemId = new Map<number, string | null>();
  for (const [key, item] of items) {
    if (item.variable === null) continue;

    const known = itemsByGetItemId.get(item.getItemId);
    if (known === undefined) itemsByGetItemId.set(item.getItemId, key);
    else if (known !== null && items.get(known)?.variable !== item.variable) {
      itemsByGetItemId.set(item.getItemId, null);
    }
  }

  return `${header}

/** Every logic variable, and whether it's a flag or a count. Items and events set these. */
export const logicVariables = {
${[...variables].map(([name, type]) => `  ${name}: '${type}'`).join(',\n')}
} as const;

export type LogicVariable = keyof typeof logicVariables;

/** Every logic variable's value: flags as booleans and counts as numbers. */
export type LogicValues = {
${[...variables].map(([name, type]) => `  readonly ${name}: ${type === 'flag' ? 'boolean' : 'number'};`).join('\n')}
};

/**
 * Reads every logic variable's value.
 *
 * @param count - How many times a variable was set. A flag is set once it's above 0.
 * @returns Each variable's value.
 */
export const readLogicValues = (count: (variable: LogicVariable) => number): LogicValues => ({
${[...variables].map(([name, type]) => `  ${name}: count('${name}')${type === 'flag' ? ' > 0' : ''}`).join(',\n')}
});

/** Every item by the generator's key, with its name in the seed and the variable it sets. */
export const items = {
${[...items]
  .map(
    ([key, item]) =>
      `  ${key}: { name: ${quote(item.name)}, variable: ${item.variable === null ? 'null' : quote(item.variable)} }`
  )
  .join(',\n')}
} as const satisfies Record<string, { name: string; variable: LogicVariable | null }>;

export type ItemKey = keyof typeof items;

/** Every item key, for looping over \`items\` without losing the key type. */
export const itemKeys: ReadonlyArray<ItemKey> = [${[...items.keys()].map((key) => `'${key}'`).join(', ')}];

/**
 * Items that set a logic variable, by the get-item ID the seed's overrides use. Null for an ID
 * shared by items that set different variables. IDs not listed don't affect logic.
 */
export const itemsByGetItemId: Readonly<Record<number, ItemKey | null>> = {
${[...itemsByGetItemId].map(([id, key]) => `  ${id}: ${key === null ? 'null' : `'${key}'`}`).join(',\n')}
};

/**
 * Each location by its name in the seed: its vanilla item, and its override key (\`scene type
 * flag\`) when no other location shares it.
 */
export const locations: Readonly<
  Record<string, { readonly vanillaItem: ItemKey | null; readonly overrideKey: string | null }>
> = {
${[...locations.values()]
  .map(({ name, vanillaItem, overrideKey }) => {
    const unique = keyUses.get(overrideKey) === 1;
    return `  ${quote(name)}: { vanillaItem: ${vanillaItem ? `'${vanillaItem}'` : 'null'}, overrideKey: ${unique ? quote(overrideKey) : 'null'} }`;
  })
  .join(',\n')}
};
`;
};

// ---- Running ----

const convertLogic = Command.make(
  'convert-logic',
  {
    generator: Argument.Directory('generator', { mustExist: true }).pipe(
      Argument.withDescription('An MM3D_Randomizer checkout, with its Z3DR submodule')
    )
  },
  Effect.fn('convertLogic')(function* ({ generator }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

    yield* Effect.promise(() => Parser.init());
    const grammar = path.join(
      import.meta.dirname,
      '../node_modules/tree-sitter-cpp/tree-sitter-cpp.wasm'
    );
    const parser = new Parser().setLanguage(yield* Effect.promise(() => Language.load(grammar)));

    const parse = Effect.fnUntraced(function* (file: string) {
      const tree = parser.parse(yield* fs.readFileString(path.join(generator, file)));
      if (!tree) return yield* new UnrecognizedSource({ message: `Couldn't parse ${file}` });
      return tree.rootNode;
    });

    const variables = readVariables(yield* parse('source/logic.cpp'));
    const getItemIds = yield* readGetItemIds(yield* parse('Z3DR/code/include/rnd/item_override.h'));
    const items = yield* readItems(yield* parse('source/item_list.cpp'), variables, getItemIds);
    const locations = yield* readLocations(yield* parse('source/item_location.cpp'), items);
    const names = { variables, items };
    const areas = yield* readAreas(yield* parse('source/location_access.cpp'), names);

    // Everything a rule points at has to exist. Exits to an area the generator never defines lead
    // to its empty placeholder, so they're dropped.
    const areaKeys = new Set(areas.map((area) => area.key));
    for (const area of areas) {
      const badEvent = area.events.find(({ target }) => variables.get(target) !== 'flag');
      const badLocation = area.locations.find(({ target }) => !locations.has(target));
      if (badEvent || badLocation) {
        const target = badEvent?.target ?? badLocation?.target;
        return yield* new UnrecognizedSource({
          message: `Unknown target ${target} in ${area.key}`
        });
      }

      for (const { target } of area.exits.filter(({ target }) => !areaKeys.has(target))) {
        yield* Effect.logWarning(`Dropped exit to undefined ${target} in ${area.key}`);
      }
    }
    const connectedAreas = areas.map((area) => ({
      ...area,
      exits: area.exits.filter(({ target }) => areaKeys.has(target))
    }));

    const version = yield* spawner.string(
      ChildProcess.make('git', ['-C', generator, 'describe', '--tags'])
    );
    const header = [
      `// Generated by scripts/convert-logic.mts from MM3D_Randomizer ${version.trim()}. Don't edit it;`,
      '// rerun the script. Derived from the generator under its MIT license (see LICENSE.md).'
    ].join('\n');

    const output = path.join(import.meta.dirname, outputDirectory);
    yield* fs.makeDirectory(output, { recursive: true });
    yield* fs.writeFileString(
      path.join(output, 'rules.ts'),
      writeRulesFile(header, connectedAreas, locations)
    );
    yield* fs.writeFileString(
      path.join(output, 'items.ts'),
      writeItemsFile(header, variables, items, locations)
    );
    yield* fs.copyFile(path.join(generator, 'LICENSE.MD'), path.join(output, 'LICENSE.md'));

    // The files are written in one long line per entry, so the project's formatter lays them out.
    const formatter = path.join(import.meta.dirname, '../node_modules/.bin/oxfmt');
    const exitCode = yield* spawner.exitCode(ChildProcess.make(formatter, [output]));
    if (exitCode !== 0) {
      return yield* new UnrecognizedSource({ message: `oxfmt failed on the output (${exitCode})` });
    }

    yield* Console.log(
      `Wrote ${areas.length} areas, ${items.size} items, and ${locations.size} locations to ${output}.`
    );
  })
).pipe(Command.withDescription("Converts the MM3D Randomizer generator's logic into TypeScript."));

convertLogic.pipe(
  Command.run({ version: '1.0.0' }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
);
