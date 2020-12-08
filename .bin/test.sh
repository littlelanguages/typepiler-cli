#!/bin/bash

deno fmt --check mod*

if [[ "$?" != "0" ]]
then
    exit -1
fi

deno test --allow-none

if [[ "$?" != "0" ]]
then
    exit -1
fi

deno run --allow-read --allow-net --allow-write mod.ts kotlin --verbose --force --directory=./test/src/main/kotlin \
    ./test/src/main/kotlin/sets/Types.llt sets.Types \
    ./test/src/main/kotlin/alias/Sample.llt alias.Sample \
    ./test/src/main/kotlin/union/Sample.llt union.Sample \
    ./test/src/main/kotlin/composite/Simple.llt composite.Simple \
    ./test/src/main/kotlin/composite/Record.llt composite.Record

(cd test ; ./gradlew test)