# node-courtlistener

A small javascript/nodejs client for CourtListener

***Note this is early code, still under development.***

## Installation

This module is installed via npm:

``` bash
$ npm install courtlistener
```

## Description

Node-Courtlistener is a client side library for getting cases form CourtListener.

The client follows a chained pattern

## API

### initialize

``` js
  var CLClient = require('courtlistener')
  , courtlistener = new CLClient();
```
<br>

### login([username], [password])

##### Description

Set the login/username for CourtListener

##### Example

```js
courtlistener.login(username, password)
```

<br>

### getCases([array of citation strings]), getCase([citation string])

##### Description

* Downloads a case matching the citation string to the current destination path for downloads.
* If no value is passed, it will use the value that is currently passing down the chain.
* Will pass the case or array of cases down the chain on completion.

##### Example

```js
courtlistener
  .login([username], [password])
  .getCases(['140 U.S. 22', '100 U.S. 50'])
  .getCase('50 U.S. 175')
```

<br>


###  citedBy(), cites() (NOT COMPLETE)

##### Description

* Gets an array of case objects from the current case on the chain.
* If no value is passed, it will use the value that is currently passing down the chain.
* Will pass the case or array of cases down the chain on completion.

##### Example

```js
courtlistener
  .login([username], [password])
  .getCase('50 U.S. 175')
  .citedBy()
  .display()
  .run()
```

<br>

### getCitations(), getCitation()

Downloads case(s) with citation object(s) from the chain to the current destination path

```js
courtlistener
  .login([username], [password])
  .display('***Running Court Listener Script***')
  .getCase('50 U.S. 175')
  .citedBy()
  .set('cites_50_US_175') // store the cites array
  .getCase('140 U.S. 192')
  .get('cites_50_US_175') //retrieve the array
  .to('cites_50_US_175')
  .getCitations() //then get those cases
  .display()
  .run()
```
<br>

### to([path])

##### Description
* Sets destination path

<br>

### set('throttle', [delay])

* Sets the throttle delay between group requests such as `.getCases()`
or `getCitations()`

```js
courtlistener
  .login(username, password)
  .display('***Running Court Listener Script***')
  .to('cases')
  .getCase('50 U.S. 175')
  .citedBy()
  .set('throttle', 1000) //set 1 second in between API calls
  .getCases()
  .run()
```

<br>

### display([value])

Display `[value]` to the console, or when no value is passed, display the value currently
in the chain.

### run([value])

Run the script, passing `[value]` to the first method in the chain.

### Other methods

*See* http://www.github.com/zornstar/diva for additional methods that can be used with the
CourtListener object instance, e.g.:


* **Event Listeners**: before, after
* **Storage/Retrieval**: set, get
* **Fork**: Fork a value off of the chain


## Example Usage

``` js
var CLClient = require('courtlistener')
  , courtlistener = new CLClient();
```

``` js
courtlistener
  .login([username], [password])
  .display('***Court listener***') //display ***Court listener*** to console
  .login('username', 'password') //login
  .to('386 U.S. 738') //set the destination path for downloaded files
  .getCase('386 U.S. 738') //search for 386 U.S. 738 and download
                          //the case to the destination folder
  .cites() //get all of the cites for '386 U.S. 738'
  .display() //display to the console all of the cites for 386 U.S. 738
  .to('cited_cases') // set the destination path for downloaded files
  .getCitations() // download all of the cited cases for '386 U.S. 738'
  .run()

```
