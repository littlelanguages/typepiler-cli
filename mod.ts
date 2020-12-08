import * as CLI from "https://raw.githubusercontent.com/littlelanguages/deno-lib-console-cli/0.1.2/mod.ts";
import * as PP from "https://raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/0.3.2/mod.ts";

import * as Kotlin from "https://raw.githubusercontent.com/littlelanguages/typepiler-tool-kotlin/main/mod.ts";

/*
deno mod.ts kotlin --versbose --directory ./test/src/main/kotlin  \
  ./test/src/main/kotlin/sets/Types.llt set.Types \
  ./test/src/main/kotlin/alias/Sample.llt alias.Sample \
  ./test/src/main/kotlin/union/Sample.llt union.Sample \
  ./test/src/main/kotlin/composite/Simple.llt composite.Simple \
  ./test/src/main/kotlin/composite/Record.llt composite.Record
]);

*/

class ValuesCommand extends CLI.Command {
  showValue: ShowValue;
  private action: (
    cli: CLI.Definition,
    files: Array<string>,
    options: Map<string, unknown>,
  ) => void;

  constructor(
    name: string,
    help: string,
    options: Array<CLI.Option>,
    showValue: ShowValue,
    action: (
      cli: CLI.Definition,
      files: Array<string>,
      options: Map<string, unknown>,
    ) => void,
  ) {
    super(name, help, options);
    this.showValue = showValue;
    this.action = action;
  }

  canDo(args: Array<string>) {
    return (args.length > 0 && args[0] === this.name);
  }

  doNow(
    cli: CLI.Definition,
    args: Array<string>,
    values: Map<string, undefined>,
  ): void {
    processOptions(cli, this.options, args, values);

    if (args.length === 0) {
      if (this.showValue.optional) {
        this.action(cli, [], values);
      } else {
        reportErrorAndTerminate(
          `${this.showValue.name} requires a value`,
          cli,
        );
      }
    } else {
      this.action(cli, args, values);
    }
  }

  show(): PP.Doc {
    const usageName = this.showValue.optional
      ? `[${this.showValue.name}]`
      : this.showValue.name;

    return PP.vcat([
      "USAGE:",
      PP.nest(
        4,
        PP.hsep(
          [
            PP.text(this.name),
            this.options.length === 0 ? PP.empty : "{OPTION}",
            usageName,
          ],
        ),
      ),
      (this.options.length === 0) ? PP.empty : PP.vcat(
        [
          "",
          "OPTION:",
          PP.nest(4, PP.vcat(this.options.flatMap((o) => o.show()))),
        ],
      ),
      "",
      this.showValue.name,
      PP.nest(4, this.showValue.help),
    ]);
  }
}

function reportErrorAndTerminate(errorMsg: string, cli: CLI.Definition): void {
  console.log(`Error: ${errorMsg}`);
  Deno.exit(-1);
}

function processOptions(
  cli: CLI.Definition,
  options: Array<CLI.Option>,
  args: Array<string>,
  values: Map<string, undefined>,
): void {
  while (args.length > 0 && args[0].startsWith("-")) {
    if (args[0] === "--") {
      args.splice(0, 1);
      break;
    }

    const option = options.find((o) => o.canDo(args));

    if (option === undefined) {
      reportErrorAndTerminate(`Invalid option ${args[0]}`, cli);
    } else {
      option.doNow(cli, args, values);
    }
  }
}

type ShowValue = {
  name: string;
  optional: boolean;
  help: string;
};

const kotlinCmd = new ValuesCommand(
  "kotlin",
  "Create an implementation of types in Kotlin",
  [
    new CLI.ValueOption(
      ["--directory", "-d"],
      "Value is the directory into which the generated Kotlin and library code is placed.  Defaults to the source file's directory.",
    ),
    new CLI.FlagOption(
      ["--force", "-f"],
      "Ignore all the file dates and force a regeneration of all generated sources.",
    ),
    new CLI.FlagOption(
      ["--verbose", "-v"],
      "Lists all the files as they are created.",
    ),
  ],
  {
    name: "SrcTargets",
    optional: false,
    help:
      "A sequence of type source files and each type file's target file name.",
  },
  (
    cli: CLI.Definition,
    files: Array<string>,
    vals: Map<String, unknown>,
  ) => {
    if (files.length % 2 === 0) {
      const srcs = [];

      for (let i = 0; i < files.length; i += 2) {
        srcs.push({ src: files[i], package: files[i + 1] });
      }

      Kotlin.command(
        srcs,
        {
          directory: vals.get("directory") as string | undefined,
          force: vals.get("force") as boolean | false,
          verbose: vals.get("verbose") as boolean | false,
        },
      );
    } else {
      reportErrorAndTerminate("Unmatched src files onto target packages", cli);
    }
  },
);

const cli = {
  name: "typepiler",
  help: "Validate and compile type definitions into executable code",
  options: [CLI.helpFlag],
  cmds: [kotlinCmd, CLI.helpCmd],
};

CLI.process(cli);
