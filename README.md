## coffee-to-es2015-codemod

[![Build Status](https://travis-ci.org/Hacker0x01/coffee-to-es2015-codemod.svg?branch=master)](https://travis-ci.org/Hacker0x01/coffee-to-es2015-codemod)

This repository contains a collection of codemod scripts that should help you convert your CoffeeScript codebase to ES2015.

This project requires [JSCodeshift](https://github.com/facebook/jscodeshift) to perform the transforms.

### Setup & run

  * `npm install -g jscodeshift`
  * `git clone https://github.com/Hacker0x01/coffee-to-es2015-codemod`
  * `jscodeshift -t <codemod-script> <file>`
  * Use the `-d` option for a dry-run and use `-p` to print the output for comparison

### Motivation

Because of the nature of the transforms (reverse engineering CoffeeScript patterns from the ES5 output), I don't think that it would ever be wise to run all transforms at once without reviewing. There's simply too much assumptions in the transforms that can go wrong for other codebases. Because of this I decided to split off this repository from the [espresso](https://github.com/HipsterBrown/espresso) repository, and try very carefully to document all the specific assumptions. In the hope that these transforms can help other people as well.

### Proposed steps to convert your CoffeeScript codebase

At HackerOne we decided to convert our codebase through the following steps:

1. Convert all CoffeeScript to ES5 by running the CoffeeScript compiler
2. Replace the CoffeeScript with the ES5 output
3. Run the first transform (TODO: define preferred order of transforms)
4. Create a PR/diff for the code change
5. After the change has been accepted go back to step 3 and start the next transformation

I know that it probably goes against the nature of a lot of people to review these changes (as they tend to get very big), but it's the only way I trust to make sure nothing gets lost. Once we completed the process @Hacker0x01 I will make sure to document how everything went, and what we've learned, but until then I suggest that everybody takes precaution in using these transforms.

### Thanks

A big thanks to @HipsterBrown for setting up [espresso](https://github.com/HipsterBrown/espresso) and writing the first set of transforms.

Another big thanks to @fkling for setting up JSCodeshift and to @cpojer for his [awesome JSConf.EU talk](https://www.youtube.com/watch?v=d0pOgY8__JM).
