// import * as CLI from "https://raw.githubusercontent.com/littlelanguages/deno-lib-console-cli/0.1.2/mod.ts";
import * as CLI from "https://raw.githubusercontent.com/littlelanguages/deno-lib-console-cli/main/mod.ts";
import * as PP from "https://raw.githubusercontent.com/littlelanguages/deno-lib-text-prettyprint/0.3.2/mod.ts";

import * as Kotlin from "https://raw.githubusercontent.com/littlelanguages/typepiler-tool-kotlin/main/mod.ts";

import { errorLocation } from "https://raw.githubusercontent.com/littlelanguages/scanpiler/0.3.0/mod.ts";
import * as Typepiler from "https://raw.githubusercontent.com/littlelanguages/typepiler/main/parser/typepiler-scanner.ts";

/*
deno mod.ts kotlin --verbose --directory=./test/src/main/kotlin  \
  ./test/src/main/kotlin/sets/Types.llt sets.Types \
  ./test/src/main/kotlin/alias/Sample.llt alias.Sample \
  ./test/src/main/kotlin/union/Sample.llt union.Sample \
  ./test/src/main/kotlin/composite/Simple.llt composite.Simple \
  ./test/src/main/kotlin/composite/Record.llt composite.Record
*/

const kotlinCmd = new CLI.ValuesCommand(
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
      ).then((errors) =>
        errors.length > 0
          ? PP.render(PP.vcat([showErrors(errors), ""]), Deno.stdout)
            .then((_) => Deno.exit(1))
          : Promise.resolve()
      );
    } else {
      CLI.reportErrorAndTerminate(
        "Unmatched src files onto target packages",
        cli,
      );
    }
  },
);

const showErrors = (errors: Kotlin.Errors): PP.Doc =>
  PP.vcat(errors.map(showError));

const showError = (error: Kotlin.ErrorItem): PP.Doc => {
  switch (error.tag) {
    case "PackageNotSetError":
      return PP.hcat(
        [
          "Reference is made to ",
          error.name,
          " which has not been passed to the CLI.",
        ],
      );
    case "DuplicateDefinitionError":
      return PP.hcat(
        [
          "Attempt to define the same name ",
          error.name,
          " again",
          errorLocation(error.location, error.src),
        ],
      );
    case "DuplicateFieldNameError":
      return PP.hcat(
        [
          "Attempt to define a duplicate field with the name ",
          error.name,
          errorLocation(error.location, error.src),
        ],
      );
    case "DuplicateSetElementError":
      return PP.hcat(
        [
          "Attempt to define a duplicate set element with the name ",
          error.name,
          errorLocation(error.location, error.src),
        ],
      );
    case "IncorrectTypeArityError":
      return PP.hcat(
        [
          "The type ",
          error.name,
          " requires ",
          error.expected.toString(),
          " arguments but received ",
          error.actual.toString(),
          errorLocation(error.location, error.src),
        ],
      );
    case "UseCycleError":
      return PP.vcat(
        [
          "A cyclic definition exists between these files:",
          PP.nest(2, PP.vcat(error.names)),
        ],
      );
    case "TypeDefinitionFileDoesNotExistError":
      return PP.hcat(
        [
          "The referenced file ",
          error.name,
          " does not exist",
        ],
      );
    case "UnionDeclarationCyclicReferenceError":
      return PP.hcat(
        [
          "The union declaration ",
          error.name,
          " is dependent on itself",
          errorLocation(error.location, error.src),
        ],
      );
    case "UnionDeclarationReferenceAliasDeclarationError":
      return PP.hcat(
        [
          "The union declaration ",
          error.name,
          " is dependent on the alias declaration ",
          error.reference,
          errorLocation(error.location, error.src),
        ],
      );
    case "UnionDeclarationReferenceCompoundTypeError":
      return PP.hcat(
        [
          "A union declaration is dependent on a compound declaration",
          errorLocation(error.location, error.src),
        ],
      );
    case "UnionDeclarationReferenceInteranlDeclarationError":
      return PP.hcat(
        [
          "The union declaration ",
          error.name,
          " is dependent on the internal declaration ",
          error.reference,
          errorLocation(error.location, error.src),
        ],
      );
    case "UnionDeclarationReferenceSetDeclarationError":
      return PP.hcat(
        [
          "The union declaration ",
          error.name,
          " is dependent on the set ",
          error.reference,
          errorLocation(error.location, error.src),
        ],
      );
    case "UnknownDeclarationError":
      return PP.hcat(
        [
          "Reference to an unknown declaration ",
          error.name,
          errorLocation(error.location, error.src),
        ],
      );
    case "SyntaxError":
      return PP.hcat([
        "Unexpected token ",
        ttokenAsString(error.found[0]),
        ". Expected ",
        PP.join(error.expected.map(ttokenAsString), ", ", " or "),
        errorLocation(error.found[1], undefined),
      ]);
  }
};

const ttokenAsString = (ttoken: Typepiler.TToken): string => {
  switch (ttoken) {
    case Typepiler.TToken.RParen:
      return "')'";
    case Typepiler.TToken.LParen:
      return "'('";
    case Typepiler.TToken.Period:
      return "'.'";
    case Typepiler.TToken.Star:
      return "'*'";
    case Typepiler.TToken.Colon:
      return "':'";
    case Typepiler.TToken.RCurly:
      return "'}'";
    case Typepiler.TToken.Comma:
      return "','";
    case Typepiler.TToken.LCurly:
      return "'{'";
    case Typepiler.TToken.Bar:
      return "'|'";
    case Typepiler.TToken.ColonColon:
      return "'::'";
    case Typepiler.TToken.Equal:
      return "'='";
    case Typepiler.TToken.Semicolon:
      return "';'";
    case Typepiler.TToken.As:
      return "as";
    case Typepiler.TToken.Use:
      return "use";
    case Typepiler.TToken.LowerID:
      return "lower case identifier";
    case Typepiler.TToken.UpperID:
      return "upper identifier";
    case Typepiler.TToken.LiteralString:
      return "literal string";
    case Typepiler.TToken.EOS:
      return "end of stream";
    case Typepiler.TToken.ERROR:
      return "error";
  }
};

const cli = {
  name: "typepiler",
  help: "Validate and compile type definitions into executable code",
  options: [CLI.helpFlag],
  cmds: [kotlinCmd, CLI.helpCmd],
};

CLI.process(cli);
