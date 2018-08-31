# Broken Link Checker
This tool is used to check broken links of websites

## Installation
### Install Node.js >= 8.9.0 and run:
```bash
npm install
```
## Usage

```bash
node link_check.js -u https://www.google.com
```
### Options
* `-u`: Mandatory, url to check
* `-l`: Optional, default is 2. Specify level to check, see example below:
 ```bash
# only first page is checked
node link_check.js -u https://www.google.com -l 1
# first page and all links discoverd from it
node link_check.js -u https://www.google.com -l 2
# etc.
node link_check.js -u https://www.google.com -l 3
# disable level, all links will be checked recursively
node link_check.js -u https://www.google.com -l 0
```
### Note
links to a different host will be checked
links discoverd on a different host will not be checked
