#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/client/out/tests"
export CODE_TESTS_WORKSPACE="$(pwd)/client/testFixtures"

node "$(pwd)/client/node_modules/vscode/bin/test"