import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem';
import * as NodePath from '@effect/platform-node/NodePath';
import { Context, Effect, FileSystem, Layer, Path, Schema } from 'effect';
import { app } from 'electron';

const settingsFileName = 'settings.json';

/** The settings file's contents. */
const SettingsFile = Schema.fromJsonString(
  Schema.Struct({ seedPath: Schema.optional(Schema.String) }),
  { space: 2 }
);

/** What the app remembers between launches. */
export class Settings extends Context.Service<
  Settings,
  {
    /** The seed remembered from an earlier launch, if there is one. */
    readonly seedPath: Effect.Effect<string | undefined>;

    /**
     * Remembers a seed for the next launch.
     *
     * @param path - Path to the seed's `code.ips`.
     */
    readonly rememberSeedPath: (path: string) => Effect.Effect<void>;
  }
>()('mm3d-randomizer-tracker/main/Settings') {
  /** Settings live layer, stored in Electron's per-user app folder. */
  static readonly layer = Layer.effect(
    Settings,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      // `~/.config/mm3d-randomizer-tracker` on Linux, or under `$XDG_CONFIG_HOME` when that's set.
      const directory = app.getPath('userData');
      const file = path.join(directory, settingsFileName);

      const seedPath = fs.readFileString(file).pipe(
        Effect.flatMap(Schema.decodeEffect(SettingsFile)),
        Effect.map((settings) => settings.seedPath),
        // No file yet is the normal first launch, and an unreadable one counts as no settings.
        Effect.orElseSucceed(() => undefined)
      );

      const rememberSeedPath = Effect.fn('Settings.rememberSeedPath')(
        function* (seedPath: string) {
          const contents = yield* Schema.encodeEffect(SettingsFile)({ seedPath });

          yield* fs.makeDirectory(directory, { recursive: true });
          yield* fs.writeFileString(file, contents);
        },
        // Not being able to save only costs choosing the seed again next launch.
        Effect.catch((error) => Effect.logError('Could not save settings', error))
      );

      return Settings.of({ seedPath, rememberSeedPath });
    })
  ).pipe(Layer.provide(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)));
}
