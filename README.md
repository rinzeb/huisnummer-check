# Introduction

Create a list of all available house letters and house number additions for Dutch adresses based on the BAG. As input a csv-file with PC6 and house numbers is used, the output is another csv-file with all known addresses for the PC6/nr combinations. 

E.g. input '1234AA, 6' might result in the output '1234AA, 6, a' '1234AA, 6, b' '1234AA, 6, b, 2'. 

## Prerequisities
You need to have a valid Nodejs installation (I use v6.9 LTS), and probably python 2.7 too. In addition, install the:
- TypeScript compiler with `npm i -g typescript`
- Typings tool with `npm i -g typings`

## Installation
In the root folder, run `npm i && typings i` to install all dependencies. Next, run `tsc` to transpile all TypeScript files (or use `tsc -w` during development). 
To debug the server, you can either use the free Visual Studio code editor (and F5), or run `node dist/run.js` from the command line.

## Configuration
Use the `config.json` to configure your setup. 

## Run
Run `node dist/run.js` without arguments to see a list of options.
