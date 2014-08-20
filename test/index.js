var CLClient = require('..')
  , courtlistener = new CLClient;

courtlistener.logEnabled = true;

courtlistener
  .display('***Court listener***')
  .login('XXX', 'XXX')
  .to('test')
  .getCases(['386 U.S. 738', '347 U.S. 483'])
  .to('cited_cases')
  .cites()
  .getCitations()
  .run()
  .error(function(err) {
    console.log('Error: ' + err)
  })
